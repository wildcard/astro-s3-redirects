import type { AstroIntegration } from 'astro';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { optionsSchema, type S3RedirectsOptions } from './config.js';
import { planRedirects } from './plan.js';

/**
 * astro-s3-redirects — materialize Astro `redirects` + directory routes as real
 * S3 301 object-redirects for AWS S3 website hosting. No edge compute.
 */
export default function s3Redirects(options: S3RedirectsOptions = {}): AstroIntegration {
  const opts = optionsSchema.parse(options);
  return {
    name: 'astro-s3-redirects',
    hooks: {
      'astro:config:done': ({ config, logger }) => {
        if (config.output !== 'static') {
          logger.warn('targets output:"static" (S3 website hosting); other modes are untested.');
        }
        if (config.build?.format !== 'directory') {
          logger.warn('set build.format:"directory" so routes map to <route>/index.html.');
        }
      },
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        // Manifest is prefix-less: the deploy layer applies a tenant prefix per site.
        const plan = planRedirects(distDir, '');
        const content = plan.filter((e) => e.kind === 'content').length;
        const normalizers = plan.length - content;

        if (opts.mode === 'manifest') {
          const path = opts.manifestPath ?? join(process.cwd(), '.astro-s3-redirects.json');
          writeFileSync(path, JSON.stringify(plan, null, 2));
          logger.info(
            `wrote ${plan.length} redirect entries (${content} content, ${normalizers} normalizers) → ${path}`,
          );
          return;
        }

        // apply / reconcile land in M2 (state-backed, mocked-S3 tested).
        logger.warn(`mode="${opts.mode}" is not implemented yet (M2); no objects were written.`);
      },
    },
  };
}

export type { S3RedirectsOptions };
export { planRedirects } from './plan.js';
export type { RedirectPlanEntry, RedirectKind } from './plan.js';
