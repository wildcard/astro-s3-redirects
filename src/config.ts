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
    /** Custom S3 endpoint for S3-compatible stores / local testing (e.g. LocalStack). */
    endpoint: z.string().url().optional(),
    /** Path-style addressing. Defaults to true when `endpoint` is set. */
    forcePathStyle: z.boolean().optional(),
  })
  .default({});

export type S3RedirectsOptions = z.input<typeof optionsSchema>;
export type ResolvedOptions = z.output<typeof optionsSchema>;

export interface RuntimeConfig {
  mode: 'manifest' | 'apply' | 'reconcile';
  bucket?: string;
  prefix: string;
  region?: string;
  manifestPath?: string;
  concurrency: number;
  stateKey?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

type Env = Record<string, string | undefined>;
const truthy = (v: string | undefined) => /^(1|true)$/i.test(v ?? '');

/** Merge options with env (options win). `S3_REDIRECTS_APPLY` flips manifest→reconcile. */
export function resolveRuntime(options: S3RedirectsOptions = {}, env: Env = process.env): RuntimeConfig {
  const o = optionsSchema.parse(options);
  const endpoint = o.endpoint ?? env.S3_REDIRECTS_ENDPOINT ?? env.AWS_ENDPOINT_URL_S3;
  return {
    mode: options.mode ?? (truthy(env.S3_REDIRECTS_APPLY) ? 'reconcile' : o.mode),
    bucket: o.bucket ?? env.S3_REDIRECTS_BUCKET,
    prefix: o.prefix || env.S3_REDIRECTS_PREFIX || '',
    region: o.region ?? env.S3_REDIRECTS_REGION ?? env.AWS_REGION,
    manifestPath: o.manifestPath,
    concurrency: o.concurrency,
    stateKey: o.stateKey,
    endpoint,
    // path-style defaults on for custom endpoints (S3-compatible stores usually need it)
    forcePathStyle: o.forcePathStyle ?? (endpoint ? !env.S3_REDIRECTS_FORCE_PATH_STYLE || truthy(env.S3_REDIRECTS_FORCE_PATH_STYLE) : undefined),
  };
}
