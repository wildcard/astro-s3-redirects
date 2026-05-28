import type { AstroIntegration } from 'astro';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { resolveRuntime, type S3RedirectsOptions } from './config.js';
import { planRedirects } from './plan.js';
import { applyRedirects, reconcileRedirects } from './reconcile.js';

/**
 * astro-s3-redirects — materialize Astro `redirects` + directory routes as real
 * S3 301 object-redirects for AWS S3 website hosting. No edge compute.
 */
export default function s3Redirects(options: S3RedirectsOptions = {}): AstroIntegration {
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
        const cfg = resolveRuntime(options);
        const distDir = fileURLToPath(dir);

        if (cfg.mode === 'manifest') {
          const plan = planRedirects(distDir, ''); // prefix-less: deploy layer applies the prefix
          const content = plan.filter((e) => e.kind === 'content').length;
          const path = cfg.manifestPath ?? join(process.cwd(), '.astro-s3-redirects.json');
          writeFileSync(path, JSON.stringify(plan, null, 2));
          logger.info(`wrote ${plan.length} redirect entries (${content} content, ${plan.length - content} normalizers) → ${path}`);
          return;
        }

        if (!cfg.bucket) {
          logger.error(`mode="${cfg.mode}" requires a bucket (option \`bucket\` or env S3_REDIRECTS_BUCKET). Skipped.`);
          return;
        }

        if (cfg.mode === 'apply') {
          const { put } = await applyRedirects({ bucket: cfg.bucket, prefix: cfg.prefix, distDir, region: cfg.region, concurrency: cfg.concurrency });
          logger.info(`applied ${put} redirect objects → s3://${cfg.bucket}/${cfg.prefix}`);
        } else {
          const r = await reconcileRedirects({ bucket: cfg.bucket, prefix: cfg.prefix, distDir, region: cfg.region, concurrency: cfg.concurrency, stateKey: cfg.stateKey });
          logger.info(`reconciled s3://${cfg.bucket}/${cfg.prefix}: +${r.created} ~${r.updated} -${r.deleted} =${r.unchanged} (state: ${r.stateKey})`);
        }
      },
    },
  };
}

export type { S3RedirectsOptions };
export { resolveRuntime } from './config.js';
export type { RuntimeConfig } from './config.js';
export { planRedirects } from './plan.js';
export type { RedirectPlanEntry, RedirectKind } from './plan.js';
export { reconcileRedirects, applyRedirects } from './reconcile.js';
export type { ReconcileOptions, ReconcileResult } from './reconcile.js';
