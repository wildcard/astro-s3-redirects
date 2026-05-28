import type { S3Client } from '@aws-sdk/client-s3'; // type-only → erased at runtime

export interface RedirectState {
  version: 1;
  bucket: string;
  prefix: string;
  updatedAt: string;
  /** S3 key → site-relative target. The minimal map needed to diff. */
  objects: Record<string, string>;
}

export interface StateStore {
  load(): Promise<RedirectState | null>;
  save(state: RedirectState): Promise<void>;
}

/** Remote-state object key, kept OUTSIDE any synced prefix; one file per prefix. */
export function stateKeyFor(prefix: string): string {
  const slug = prefix.replace(/^\/+|\/+$/g, '') || '_root';
  return `_redirect-state/${slug.replace(/[^A-Za-z0-9]+/g, '_')}.json`;
}

/** State stored as a JSON object in the bucket itself (the Terraform-S3-backend analog). */
export class S3StateStore implements StateStore {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly key: string,
  ) {}

  async load(): Promise<RedirectState | null> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    try {
      const r = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key }));
      return JSON.parse(await r.Body!.transformToString()) as RedirectState;
    } catch (e: unknown) {
      const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null; // first deploy
      throw e;
    }
  }

  async save(state: RedirectState): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key,
        Body: JSON.stringify(state, null, 2),
        ContentType: 'application/json',
      }),
    );
  }
}

/** In-memory store for tests / dry composition. */
export class MemoryStateStore implements StateStore {
  constructor(private state: RedirectState | null = null) {}
  async load(): Promise<RedirectState | null> {
    return this.state;
  }
  async save(state: RedirectState): Promise<void> {
    this.state = state;
  }
}
