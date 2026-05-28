import type { AstroIntegration } from 'astro';
import { optionsSchema, type S3RedirectsOptions } from './config.js';

/**
 * astro-s3-redirects — materialize Astro `redirects` + directory routes as real
 * S3 301 object-redirects for AWS S3 website hosting. No edge compute.
 *
 * NOTE: the redirect-planning + apply/reconcile logic is implemented test-first
 * in M1/M2 (`src/plan.ts`, `src/reconcile.ts`). This factory wires the hooks and
 * validates config; build:done currently logs the resolved mode.
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
      'astro:build:done': ({ logger }) => {
        // M1: planRedirects(dir, prefix) → manifest; M2: apply/reconcile.
        logger.info(`mode=${opts.mode} — redirect planning lands in M1 (TDD).`);
      },
    },
  };
}

export type { S3RedirectsOptions };
