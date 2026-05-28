import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export type RedirectKind = 'content' | 'normalizer';

export interface RedirectPlanEntry {
  /** S3 object key (prefix-joined). */
  key: string;
  /** Site-relative redirect target (never includes the tenant prefix). */
  target: string;
  /** `content` = from an Astro `redirects` meta-refresh page; `normalizer` = trailing-slash. */
  kind: RedirectKind;
}

// Astro static `redirects` emit: <meta http-equiv="refresh" content="0;url=/target/">
const META_REFRESH = /http-equiv=["']refresh["']\s+content=["']\s*\d+\s*;\s*url=([^"']+)["']/i;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/**
 * Pure planner: walk a built `dist/` and compute the S3 redirect objects to write.
 * - A directory route whose `index.html` is an Astro meta-refresh page → `content`
 *   redirect: a bare-key object AND the page key, both → the (site-relative) target.
 * - Any other directory route → `normalizer`: a bare-key object → `/<route>/`.
 * The site root (`index.html`) is skipped (S3 serves it natively).
 */
export function planRedirects(distDir: string, prefix = ''): RedirectPlanEntry[] {
  const p = prefix.replace(/^\/+|\/+$/g, '');
  const out: RedirectPlanEntry[] = [];
  for (const file of walk(distDir)) {
    const isIndex = file === join(distDir, 'index.html') || file.endsWith(`${sep}index.html`);
    if (!isIndex) continue;
    const route = relative(distDir, file).replace(new RegExp(`[/\\\\]index\\.html$`), '').split(sep).join('/');
    if (!route || route === 'index.html') continue; // site root → S3 serves it directly
    const key = p ? `${p}/${route}` : route;
    const match = readFileSync(file, 'utf8').match(META_REFRESH);
    if (match && match[1]) {
      const target = match[1];
      out.push({ key, target, kind: 'content' });
      out.push({ key: `${key}/index.html`, target, kind: 'content' }); // upgrade meta-refresh → real 301
    } else {
      out.push({ key, target: `/${route}/`, kind: 'normalizer' });
    }
  }
  return out;
}
