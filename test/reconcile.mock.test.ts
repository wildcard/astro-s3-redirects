import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest/vitest';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcileRedirects } from '../src/reconcile.js';
import { MemoryStateStore } from '../src/state.js';

const s3 = mockClient(S3Client);

let dist: string;
function page(route: string, html: string) {
  const d = join(dist, route);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'index.html'), html);
}
function buildDist(withMe = true) {
  dist = mkdtempSync(join(tmpdir(), 'asr-rec-'));
  writeFileSync(join(dist, 'index.html'), '<h1>home</h1>'); // root (skipped)
  page('about', '<h1>about</h1>'); // normalizer
  if (withMe) page('me', '<meta http-equiv="refresh" content="0;url=/about/">'); // content x2
}

beforeEach(() => {
  s3.reset();
  s3.on(PutObjectCommand).resolves({});
  s3.on(DeleteObjectsCommand).resolves({});
  buildDist();
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

describe('reconcileRedirects', () => {
  it('first deploy creates every redirect object and writes state', async () => {
    const store = new MemoryStateStore(null);
    const r = await reconcileRedirects({ bucket: 'b', distDir: dist, stateStore: store });
    expect(r).toMatchObject({ created: 3, updated: 0, deleted: 0, unchanged: 0 }); // about + me + me/index.html
    expect(s3).toHaveReceivedCommandTimes(PutObjectCommand, 3);
    expect((await store.load())?.objects['me']).toBe('/about/');
  });

  it('PUTs site-relative targets (no prefix leak) with the right metadata', async () => {
    await reconcileRedirects({ bucket: 'b', prefix: 'alpha/builds/site-aaaa', distDir: dist, stateStore: new MemoryStateStore(null) });
    expect(s3).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: 'b',
      Key: 'alpha/builds/site-aaaa/me',
      WebsiteRedirectLocation: '/about/',
      ContentType: 'text/html',
    });
  });

  it('is idempotent — a second run with unchanged dist writes nothing', async () => {
    const store = new MemoryStateStore(null);
    await reconcileRedirects({ bucket: 'b', distDir: dist, stateStore: store });
    s3.resetHistory();
    const r = await reconcileRedirects({ bucket: 'b', distDir: dist, stateStore: store });
    expect({ c: r.created, u: r.updated, d: r.deleted }).toEqual({ c: 0, u: 0, d: 0 });
    expect(r.unchanged).toBe(3);
    expect(s3).toHaveReceivedCommandTimes(PutObjectCommand, 0);
    expect(s3).toHaveReceivedCommandTimes(DeleteObjectsCommand, 0);
  });

  it('deletes the keys of a dropped redirect (ownership-scoped)', async () => {
    const store = new MemoryStateStore(null);
    await reconcileRedirects({ bucket: 'b', distDir: dist, stateStore: store }); // with me
    const distWith = dist;
    buildDist(false); // rebuild without /me/
    s3.resetHistory();
    const r = await reconcileRedirects({ bucket: 'b', distDir: dist, stateStore: store });
    expect(r.deleted).toBe(2);
    expect(r.toDelete.sort()).toEqual(['me', 'me/index.html']);
    expect(s3).toHaveReceivedCommandWith(DeleteObjectsCommand, {
      Bucket: 'b',
      Delete: { Objects: [{ Key: 'me' }, { Key: 'me/index.html' }] },
    });
    rmSync(distWith, { recursive: true, force: true });
  });

  it('updates a redirect whose target changed', async () => {
    const store = new MemoryStateStore({
      version: 1, bucket: 'b', prefix: '', updatedAt: '', objects: { about: '/about/', me: '/old/', 'me/index.html': '/old/' },
    });
    const r = await reconcileRedirects({ bucket: 'b', distDir: dist, stateStore: store });
    expect(r.updated).toBe(2); // me + me/index.html now → /about/
    expect(r.created).toBe(0);
    expect(r.unchanged).toBe(1); // about
  });

  it('dryRun computes the diff but performs no S3 writes', async () => {
    const r = await reconcileRedirects({ bucket: 'b', distDir: dist, stateStore: new MemoryStateStore(null), dryRun: true });
    expect(r.created).toBe(3);
    expect(s3).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });
});
