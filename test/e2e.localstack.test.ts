/**
 * End-to-end against a LOCAL S3 stack (LocalStack, S3 website hosting).
 * Reconciles real redirect objects via the AWS SDK, then asserts a REAL 301
 * from the S3 website endpoint over HTTP. Skips cleanly when LocalStack is down
 * (so CI without Docker stays green).
 *
 * Start the stack:
 *   docker run -d --name asr-localstack -p 4566:4566 -e SERVICES=s3 localstack/localstack:3.0.2
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  S3Client,
  CreateBucketCommand,
  PutBucketWebsiteCommand,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { reconcileRedirects } from '../src/reconcile.js';

const ENDPOINT = 'http://localhost:4566';

async function probe(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`${ENDPOINT}/_localstack/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}
const LS_UP = await probe();

/** GET the S3 *website* endpoint (Host-header routed; node:http so we can set Host & not follow). */
function web(bucket: string, path: string): Promise<{ status: number; location?: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: 'localhost', port: 4566, path, method: 'GET', headers: { Host: `${bucket}.s3-website.localhost.localstack.cloud` } },
      (res) => {
        res.resume();
        resolve({ status: res.statusCode ?? 0, location: res.headers.location });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function builtSite(withMe: boolean): string {
  const dist = mkdtempSync(join(tmpdir(), 'asr-e2e-'));
  writeFileSync(join(dist, 'index.html'), '<h1>home</h1>'); // root (skipped by planner)
  mkdirSync(join(dist, 'about'), { recursive: true });
  writeFileSync(join(dist, 'about', 'index.html'), '<h1>about</h1>'); // page → normalizer
  if (withMe) {
    mkdirSync(join(dist, 'me'), { recursive: true });
    writeFileSync(join(dist, 'me', 'index.html'), '<meta http-equiv="refresh" content="0;url=/about/">');
  }
  return dist;
}

describe.skipIf(!LS_UP)('e2e: astro-s3-redirects against LocalStack S3 website hosting', () => {
  const bucket = `asr-e2e-${Date.now()}`;
  let client: S3Client;
  let dist: string;

  beforeAll(async () => {
    // LocalStack 3.0.2 rejects the SDK's default streaming-checksum trailer.
    process.env.AWS_REQUEST_CHECKSUM_CALCULATION = 'when_required';
    process.env.AWS_RESPONSE_CHECKSUM_VALIDATION = 'when_required';
    client = new S3Client({
      endpoint: ENDPOINT,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    });
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(
      new PutBucketWebsiteCommand({
        Bucket: bucket,
        WebsiteConfiguration: { IndexDocument: { Suffix: 'index.html' }, ErrorDocument: { Key: '404.html' } },
      }),
    );
    // The integration writes only redirect objects; site content normally arrives
    // via `aws s3 sync`. Upload the one page we assert 200 on.
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: 'about/index.html', Body: '<h1>about</h1>', ContentType: 'text/html' }),
    );
    dist = builtSite(true);
  });

  afterAll(async () => {
    try {
      const list = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
      const keys = (list.Contents ?? []).map((o) => ({ Key: o.Key! }));
      if (keys.length) await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
      await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    } catch {
      /* best-effort */
    }
    rmSync(dist, { recursive: true, force: true });
  });

  it('first reconcile creates every redirect object with site-relative metadata', async () => {
    const r = await reconcileRedirects({ bucket, distDir: dist, client });
    expect(r.created).toBe(3); // about (normalizer) + me + me/index.html (content)
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: 'me' }));
    expect(head.WebsiteRedirectLocation).toBe('/about/');
  });

  it('serves a REAL 301 from S3 website hosting (the headline)', async () => {
    expect(await web(bucket, '/me')).toMatchObject({ status: 301 });
    expect((await web(bucket, '/me')).location).toMatch(/\/about\/$/); // site-relative target, no prefix
    expect(await web(bucket, '/about')).toMatchObject({ status: 301 }); // bare-key normalizer
    expect((await web(bucket, '/about/')).status).toBe(200); // index served directly
  });

  it('is idempotent on re-run (zero writes)', async () => {
    const r = await reconcileRedirects({ bucket, distDir: dist, client });
    expect(r.created + r.updated + r.deleted).toBe(0);
    expect(r.unchanged).toBe(3);
  });

  it('ownership-scoped delete: dropping /me/ removes its objects and the 301 stops', async () => {
    const dist2 = builtSite(false);
    const r = await reconcileRedirects({ bucket, distDir: dist2, client });
    expect(r.deleted).toBe(2);
    expect(r.toDelete.sort()).toEqual(['me', 'me/index.html']);
    expect((await web(bucket, '/me')).status).toBe(404); // object gone → no redirect
    expect((await web(bucket, '/about/')).status).toBe(200); // sibling content untouched
    rmSync(dist2, { recursive: true, force: true });
  });
});
