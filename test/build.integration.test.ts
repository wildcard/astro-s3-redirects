/**
 * Integration: run a REAL `astro build` on a fixture project that uses the
 * integration in manifest mode, and assert the emitted redirect manifest.
 * Proves the hook fires correctly inside Astro's lifecycle (not just the planner).
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const fixture = join(repo, 'test/fixtures/basic');
const manifest = join(fixture, '.manifest.json');

interface Entry { key: string; target: string; kind: string }

describe('integration: astro build emits the redirect manifest', () => {
  it('runs the build hook and writes content + normalizer entries', () => {
    rmSync(manifest, { force: true });
    rmSync(join(fixture, 'dist'), { recursive: true, force: true });

    execFileSync('npx', ['astro', 'build', '--root', fixture], {
      cwd: repo,
      stdio: 'pipe',
      timeout: 120_000,
    });

    expect(existsSync(manifest)).toBe(true);
    const plan: Entry[] = JSON.parse(readFileSync(manifest, 'utf8'));
    const byKey = Object.fromEntries(plan.map((e) => [e.key, e]));

    // /me/ → /about/ becomes a content redirect on both keys
    expect(byKey['me']).toMatchObject({ target: '/about/', kind: 'content' });
    expect(byKey['me/index.html']).toMatchObject({ target: '/about/', kind: 'content' });
    // /about/ page becomes a trailing-slash normalizer
    expect(byKey['about']).toMatchObject({ target: '/about/', kind: 'normalizer' });

    rmSync(manifest, { force: true });
    rmSync(join(fixture, 'dist'), { recursive: true, force: true });
  }, 130_000);
});
