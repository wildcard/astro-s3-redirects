import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { planRedirects } from './plan.js';
import { S3StateStore, stateKeyFor, type StateStore, type RedirectState } from './state.js';

/** Bounded-concurrency map — the batching primitive (S3 has no bulk PUT). */
async function pool<T>(items: readonly T[], limit: number, fn: (t: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      await fn(next);
    }
  });
  await Promise.all(workers);
}

export interface ReconcileOptions {
  bucket: string;
  distDir: string;
  prefix?: string;
  region?: string;
  concurrency?: number;
  stateKey?: string;
  dryRun?: boolean;
  /** Override the S3 client (tests / custom credentials). */
  client?: S3Client;
  /** Override the state backend (tests use MemoryStateStore). */
  stateStore?: StateStore;
}

export interface ReconcileResult {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  stateKey: string;
  toPut: string[];
  toDelete: string[];
}

/**
 * State-backed reconcile: create/update changed redirect objects, delete the ones
 * dropped from config, skip unchanged. Deletes are ownership-scoped (only keys this
 * tool recorded in state). Use when NOT relying on `aws s3 sync --delete`.
 */
export async function reconcileRedirects(opts: ReconcileOptions): Promise<ReconcileResult> {
  const { bucket, distDir, prefix = '', concurrency = 24, dryRun = false } = opts;
  const client = opts.client ?? new S3Client({ region: opts.region });
  const stateKey = opts.stateKey ?? stateKeyFor(prefix);
  const store = opts.stateStore ?? new S3StateStore(client, bucket, stateKey);

  const prev = (await store.load())?.objects ?? {};
  const desired: Record<string, string> = {};
  for (const entry of planRedirects(distDir, prefix)) desired[entry.key] = entry.target;

  const created: string[] = [];
  const updated: string[] = [];
  for (const [key, target] of Object.entries(desired)) {
    if (!(key in prev)) created.push(key);
    else if (prev[key] !== target) updated.push(key);
  }
  const toPut = [...created, ...updated];
  const toDelete = Object.keys(prev).filter((key) => !(key in desired));
  const unchanged = Object.keys(desired).length - toPut.length;

  if (!dryRun) {
    await pool(toPut, concurrency, async (key) => {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          WebsiteRedirectLocation: desired[key]!,
          ContentType: 'text/html',
          Body: Buffer.from(''),
        }),
      );
    });
    for (let i = 0; i < toDelete.length; i += 1000) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: toDelete.slice(i, i + 1000).map((Key) => ({ Key })) },
        }),
      );
    }
    const next: RedirectState = {
      version: 1,
      bucket,
      prefix,
      updatedAt: new Date().toISOString(),
      objects: desired,
    };
    await store.save(next);
  }

  return { created: created.length, updated: updated.length, deleted: toDelete.length, unchanged, stateKey, toPut, toDelete };
}

/** Blind apply (idempotent overwrite, no state). Use alongside `aws s3 sync --delete`. */
export async function applyRedirects(
  opts: Omit<ReconcileOptions, 'stateStore' | 'stateKey' | 'dryRun'>,
): Promise<{ put: number }> {
  const { bucket, distDir, prefix = '', concurrency = 24 } = opts;
  const client = opts.client ?? new S3Client({ region: opts.region });
  const plan = planRedirects(distDir, prefix);
  await pool(plan, concurrency, async (entry) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: entry.key,
        WebsiteRedirectLocation: entry.target,
        ContentType: 'text/html',
        Body: Buffer.from(''),
      }),
    );
  });
  return { put: plan.length };
}
