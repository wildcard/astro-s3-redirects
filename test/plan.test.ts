import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planRedirects } from '../src/plan.js';

let dist: string;
beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'asr-plan-'));
});
afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

function page(route: string, html: string) {
  const d = join(dist, route);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'index.html'), html);
}

describe('planRedirects', () => {
  it('returns nothing for an empty dist', () => {
    expect(planRedirects(dist)).toEqual([]);
  });

  it('skips the site root index.html', () => {
    writeFileSync(join(dist, 'index.html'), '<h1>home</h1>');
    expect(planRedirects(dist)).toEqual([]);
  });

  it('emits a trailing-slash normalizer for a plain page route', () => {
    page('about', '<h1>about</h1>');
    expect(planRedirects(dist)).toEqual([
      { key: 'about', target: '/about/', kind: 'normalizer' },
    ]);
  });

  it('handles nested page routes', () => {
    page('products/kayak', '<h1>kayak</h1>');
    expect(planRedirects(dist)).toContainEqual({
      key: 'products/kayak',
      target: '/products/kayak/',
      kind: 'normalizer',
    });
  });

  it('detects a meta-refresh redirect page and upgrades both keys to the target', () => {
    page('me', '<meta http-equiv="refresh" content="0;url=/about/">');
    const plan = planRedirects(dist);
    expect(plan).toContainEqual({ key: 'me', target: '/about/', kind: 'content' });
    expect(plan).toContainEqual({ key: 'me/index.html', target: '/about/', kind: 'content' });
    expect(plan).toHaveLength(2);
  });

  it('tolerates whitespace in the refresh content attribute', () => {
    page('old', "<meta http-equiv='refresh' content='0; url=/new/'>");
    expect(planRedirects(dist)).toContainEqual({ key: 'old', target: '/new/', kind: 'content' });
  });

  it('joins a tenant prefix into keys but keeps targets site-relative', () => {
    page('about', '<h1>a</h1>');
    page('me', '<meta http-equiv="refresh" content="0;url=/about/">');
    const plan = planRedirects(dist, 'alpha/builds/site-aaaa');
    expect(plan).toContainEqual({
      key: 'alpha/builds/site-aaaa/about',
      target: '/about/',
      kind: 'normalizer',
    });
    expect(plan).toContainEqual({
      key: 'alpha/builds/site-aaaa/me',
      target: '/about/',
      kind: 'content',
    });
    expect(plan).toContainEqual({
      key: 'alpha/builds/site-aaaa/me/index.html',
      target: '/about/',
      kind: 'content',
    });
  });

  it('normalizes surrounding slashes on the prefix', () => {
    page('about', '<h1>a</h1>');
    expect(planRedirects(dist, '/p/')).toContainEqual({
      key: 'p/about',
      target: '/about/',
      kind: 'normalizer',
    });
  });
});
