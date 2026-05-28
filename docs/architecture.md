# Architecture

## The mechanism: a redirect is just an S3 object

S3 resolves the **exact key first**. So for a directory route `/<route>/`, an object
at the *bare* key `<route>` (no slash) carrying `x-amz-website-redirect-location`
pre-empts S3's implicit trailing-slash redirect — and because the target is a literal
**site-relative** string we author (`/<route>/`), S3 returns it verbatim. No tenant
prefix ever appears, so it survives CloudFront Origin Path.

```
GET /about            (browser)
  → CloudFront Origin Path → s3://bucket/<prefix>/about
  → S3 finds the OBJECT → 301  Location: /about/   ← literal we wrote, no prefix
  → browser GET /about/ → Origin Path → …/about/index.html → 200
```

## What the planner emits (`src/plan.ts`)

Pure function over the built `dist/`. For each `<route>/index.html`:

| Built page | Emitted object(s) | `kind` |
|---|---|---|
| Astro `redirects` meta-refresh page (`<meta http-equiv="refresh" content="0;url=/t/">`) | `<route>` **and** `<route>/index.html` → `/t/` | `content` |
| any other directory route | `<route>` → `/<route>/` | `normalizer` |
| site root `index.html` | — (S3 serves it natively) | — |

Targets are always site-relative; keys are joined with the tenant `prefix`.

## Modes (`src/index.ts`, `src/reconcile.ts`)

- **`manifest`** (default) — `astro:build:done` writes `.astro-s3-redirects.json`
  (prefix-less) for your deploy/IaC layer. Zero AWS deps.
- **`apply`** — blind PUT of every redirect object (use alongside `aws s3 sync --delete`).
- **`reconcile`** — state-backed diff (`src/state.ts`): create/update changed, batch-delete
  dropped (`DeleteObjects`, 1000/call), skip unchanged. State lives in the bucket at
  `_redirect-state/<prefix>.json` (the Terraform-S3-backend analog) → idempotent,
  ownership-scoped deletes. Use when NOT relying on a destructive sync.

## Boundaries

- **`302`**: S3 object-redirects are `301`-only; `302` needs a routing rule.
- **Tenant 404**: S3's single `ErrorDocument` key is bucket-root-relative; serve a
  per-tenant 404 via a CloudFront **custom error response** (config, no compute).
- **Many tenants, one distribution by Host**: Origin Path is static per origin, so
  that consolidation needs a CloudFront Function — out of scope here.
