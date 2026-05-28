/**
 * FULL end-to-end against LocalStack — the real production story:
 *   1. scaffold a fresh Astro starter (`npm create astro` — minimal template)
 *   2. install THIS plugin as a packed tarball (the published artifact shape)
 *   3. add `redirects` + the integration; `astro build` (static) emits the manifest
 *   4. mimic a production deploy: upload dist/ static content to the bucket
 *   5. apply the redirects LAST (the documented order — so the meta-refresh pages
 *      synced in step 4 are overwritten by real 301 objects)
 *   6. assert over HTTP: static pages serve 200, configured redirects serve real 301
 *
 * Heavy (scaffolds + installs + builds), so it is OPT-IN:
 *   docker run -d --name asr-localstack -p 4566:4566 -e SERVICES=s3 localstack/localstack:3.0.2
 *   RUN_FULL_E2E=1 npm test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  S3Client, CreateBucketCommand, PutBucketWebsiteCommand, PutObjectCommand,
  HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { reconcileRedirects } from '../src/index.js'; // the plugin's public apply engine

const ENDPOINT = 'http://localhost:4566';
const pluginRoot = fileURLToPath(new URL('..', import.meta.url));

async function probe(): Promise<boolean> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 1500);
    const r = await fetch(`${ENDPOINT}/_localstack/health`, { signal: c.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}
const LS_UP = await probe();
const RUN = process.env.RUN_FULL_E2E === '1';

function web(bucket: string, path: string): Promise<{ status: number; location?: string; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: 'localhost', port: 4566, path, method: 'GET', headers: { Host: `${bucket}.s3-website.localhost.localstack.cloud` } },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, location: res.headers.location, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

const CT: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.ico': 'image/x-icon' };
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe.skipIf(!(LS_UP && RUN))('FULL e2e: fresh Astro starter + plugin → LocalStack S3', () => {
  const bucket = `asr-full-${Date.now()}`;
  let client: S3Client;
  let work: string;
  let site: string;
  let tarball: string;
  let manifestPath: string;

  beforeAll(async () => {
    process.env.AWS_REQUEST_CHECKSUM_CALCULATION = 'when_required';
    process.env.AWS_RESPONSE_CHECKSUM_VALIDATION = 'when_required';

    // 1+2. build & pack the plugin (the artifact a user would `npm install`)
    execFileSync('npm', ['run', 'build'], { cwd: pluginRoot, stdio: 'pipe' });
    tarball = execFileSync('npm', ['pack', '--silent'], { cwd: pluginRoot }).toString().trim().split('\n').pop()!;

    // 3. scaffold a fresh Astro starter (minimal template, installs deps)
    work = mkdtempSync(join(tmpdir(), 'asr-full-'));
    execFileSync('npm', ['create', 'astro@latest', 'site', '--', '--template', 'minimal', '--install', '--no-git', '--skip-houston', '--yes'], {
      cwd: work, stdio: 'pipe', timeout: 300_000,
    });
    site = join(work, 'site');
    manifestPath = join(site, '.astro-s3-redirects.json');

    // 4. install THIS plugin (tarball) into the fresh site
    execFileSync('npm', ['install', join(pluginRoot, tarball)], { cwd: site, stdio: 'pipe', timeout: 180_000 });

    // add an /about page and wire the integration (manifest mode — the build emits the plan)
    writeFileSync(join(site, 'src/pages/about.astro'), '<html><head><title>About</title></head><body><h1>E2E_ABOUT_OK</h1></body></html>\n');
    writeFileSync(
      join(site, 'astro.config.mjs'),
      `import { defineConfig } from 'astro/config';\n` +
      `import s3Redirects from 'astro-s3-redirects';\n` +
      `export default defineConfig({\n` +
      `  output: 'static', trailingSlash: 'always', build: { format: 'directory' },\n` +
      `  redirects: { '/old/': '/about/' },\n` +
      `  integrations: [s3Redirects({ manifestPath: ${JSON.stringify(manifestPath)} })],\n` +
      `});\n`,
    );

    // 5. create + configure the LocalStack bucket as a static website
    client = new S3Client({ endpoint: ENDPOINT, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(new PutBucketWebsiteCommand({ Bucket: bucket, WebsiteConfiguration: { IndexDocument: { Suffix: 'index.html' }, ErrorDocument: { Key: '404.html' } } }));

    // 6. astro build — the integration runs in the build hook and writes the manifest
    execFileSync('npm', ['run', 'build'], { cwd: site, stdio: 'pipe', timeout: 180_000 });

    // 7. PRODUCTION DEPLOY: upload the static dist/ content to the bucket
    const dist = join(site, 'dist');
    for (const file of walk(dist)) {
      const key = relative(dist, file).split(sep).join('/');
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: readFileSync(file), ContentType: CT[extname(file)] ?? 'application/octet-stream' }));
    }

    // 8. apply redirects LAST (the plugin's engine) so the 301 objects overwrite the
    //    meta-refresh pages just synced — the documented production order.
    await reconcileRedirects({ bucket, distDir: dist, client });
  }, 600_000);

  afterAll(async () => {
    try {
      const list = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
      const keys = (list.Contents ?? []).map((o) => ({ Key: o.Key! }));
      if (keys.length) await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
      await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    } catch { /* best-effort */ }
    if (work) rmSync(work, { recursive: true, force: true });
    if (tarball) rmSync(join(pluginRoot, tarball), { force: true });
  });

  it('the integration ran in the real build and emitted the manifest', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const plan: Array<{ key: string; target: string; kind: string }> = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(plan).toContainEqual({ key: 'old', target: '/about/', kind: 'content' });
    expect(plan).toContainEqual({ key: 'about', target: '/about/', kind: 'normalizer' });
  });

  it('serves the built static site (200) from S3 website hosting', async () => {
    const r = await web(bucket, '/about/');
    expect(r.status).toBe(200);
    expect(r.body).toContain('E2E_ABOUT_OK'); // real built content the plugin never touched
  });

  it('serves a REAL 301 for the configured Astro redirect', async () => {
    const slash = await web(bucket, '/old/');
    expect(slash.status).toBe(301);
    expect(slash.location).toMatch(/\/about\/$/); // site-relative target, no bucket prefix
    expect((await web(bucket, '/old')).status).toBe(301); // bare-key normalizer too
  });

  it('the plugin wrote redirect objects with site-relative metadata', async () => {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: 'old' }));
    expect(head.WebsiteRedirectLocation).toBe('/about/');
  });
});
