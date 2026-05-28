import { z } from 'zod';

/**
 * User-facing options. All optional; env vars (S3_REDIRECTS_*) fill gaps so the
 * config stays clean and CI can drive apply/reconcile mode without edits.
 */
export const optionsSchema = z
  .object({
    /** Target bucket. Falls back to S3_REDIRECTS_BUCKET. Required for apply/reconcile. */
    bucket: z.string().optional(),
    /** Tenant prefix, e.g. "alpha/builds/site-aaaa". Empty = single-tenant root. */
    prefix: z.string().default(''),
    /** Bucket region. Falls back to S3_REDIRECTS_REGION / AWS_REGION. */
    region: z.string().optional(),
    /** manifest = emit JSON only (zero AWS); apply = PUT objects; reconcile = state-backed diff. */
    mode: z.enum(['manifest', 'apply', 'reconcile']).default('manifest'),
    /** Where to write the manifest (manifest mode). Default: .astro-s3-redirects.json at cwd. */
    manifestPath: z.string().optional(),
    /** Parallel S3 PUTs. */
    concurrency: z.number().int().positive().default(24),
    /** Override the remote state object key (reconcile mode). */
    stateKey: z.string().optional(),
  })
  .default({});

export type S3RedirectsOptions = z.input<typeof optionsSchema>;
export type ResolvedOptions = z.output<typeof optionsSchema>;
