# astro-s3-redirects

[![npm](https://img.shields.io/npm/v/astro-s3-redirects.svg)](https://www.npmjs.com/package/astro-s3-redirects)
[![CI](https://github.com/wildcard/astro-s3-redirects/actions/workflows/ci.yml/badge.svg)](https://github.com/wildcard/astro-s3-redirects/actions/workflows/ci.yml)
[![astro-integration](https://img.shields.io/badge/astro-integration-FF5D01)](https://astro.build/integrations/)

> Turn Astro's `redirects` (and directory routes) into **real S3 `301` object-redirects**
> for **AWS S3 website hosting** — no Lambda@Edge, no CloudFront Functions, no extra AWS resources.

Astro's built-in [`redirects`](https://docs.astro.build/en/guides/routing/#configured-redirects)
emits **meta-refresh HTML** on static builds (an HTTP `200` + a client-side hop). On AWS S3
website hosting — especially **multi-tenant** single-bucket setups behind CloudFront Origin
Path — that's weak and can leak the tenant prefix. This integration rewrites each redirect (and
normalizes trailing slashes) into a plain S3 object carrying `x-amz-website-redirect-location`
with a **site-relative** target: a real server `301`, prefix-safe, zero edge compute.

Inspired by the same object-redirect technique used by `gatsby-plugin-s3`, `jekyll-s3`,
`s3_website`, and Hugo→S3 tooling — brought to Astro, with multi-tenant prefix-safety and
state-backed reconciliation. Origin: Astro roadmap
[#319](https://github.com/withastro/roadmap/discussions/319).

## When to use this — and when NOT to

| ✅ Use it when | ❌ Do NOT use it when |
|---|---|
| Static Astro deployed to **S3 website hosting** (CloudFront → S3 *website* origin) | Your host has **native redirects** (Vercel / Netlify / Cloudflare Pages) — use those |
| You use `redirects{}` and/or want clean **trailing-slash** behavior on S3 | You serve S3 via **REST origin + OAC** (it ignores `WebsiteRedirectLocation`) |
| **Multi-tenant** single bucket with per-tenant prefixes (CloudFront Origin Path) | You already run a **CloudFront Function / Lambda@Edge** doing URL rewrites |
| You want **zero edge compute** / no extra AWS resources | You need **`302`** or complex rule-based redirects at scale (S3 routing-rule cap) |
| | You use **SSR / on-demand** rendering (this is static-only) |

## Status

Pre-release (`0.0.0`). Built clean-room, TDD. See `docs/` for the use-case deep dive,
`launch/` for the release + Astro-docs-contribution plan. Not yet published to npm.

## Install (planned)

```bash
npx astro add astro-s3-redirects     # or: npm i astro-s3-redirects
npm i @aws-sdk/client-s3             # only for apply/reconcile modes
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import s3Redirects from 'astro-s3-redirects';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects: { '/old/': '/new/' },
  integrations: [s3Redirects()],   // manifest mode (default, zero AWS)
});
```

## Modes

| Mode | What it does | AWS deps |
|---|---|---|
| `manifest` (default) | Emits `.astro-s3-redirects.json` for your deploy/IaC layer to apply | none |
| `apply` | PUTs the S3 redirect objects at build time | `@aws-sdk/client-s3` |
| `reconcile` | State-backed create/update/delete (ownership-scoped, idempotent) | `@aws-sdk/client-s3` |

## License

MIT © wildcard
