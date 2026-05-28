# Use case — when to reach for `astro-s3-redirects`

Astro's built-in [`redirects`](https://docs.astro.build/en/guides/routing/#configured-redirects)
work great on hosts with native redirect support. On **AWS S3 website hosting**
they don't: a static build turns each redirect into a **meta-refresh HTML page**
(HTTP `200` + a client-side hop), and on a **multi-tenant** bucket the implicit
trailing-slash redirect leaks the tenant prefix. This integration closes that gap
by writing real S3 **`301` object-redirects** (`x-amz-website-redirect-location`)
with **site-relative** targets — no edge compute.

## ✅ Use it when

- You deploy a **static** Astro site to **S3 website hosting** (CloudFront → the
  S3 *website* endpoint as a custom origin).
- You use `redirects{}` and/or want clean **trailing-slash** behavior (`/about` → `/about/`).
- You run **multi-tenant**: one bucket, many sites under per-tenant prefixes
  selected by CloudFront **Origin Path**. Site-relative targets stay prefix-safe.
- You want **zero edge compute** and **no extra AWS resource** — just bucket objects.

## ❌ Do NOT use it when

| Situation | Use instead |
|---|---|
| Host has native redirects (Vercel, Netlify, Cloudflare Pages) | the host's `_redirects` / config |
| S3 via **REST origin + OAC** (private bucket) | a CloudFront Function (REST origin ignores `WebsiteRedirectLocation`) |
| You already run a **CloudFront Function / Lambda@Edge** for rewrites | do redirects there |
| You need **`302`/temporary** or complex rule-based redirects at scale | S3 **routing rules** (note the ~50-rule cap) or an edge function |
| **SSR / on-demand** rendering | Astro adapter + the platform's redirect mechanism |

## Why S3 website hosting specifically

`WebsiteRedirectLocation` is only honored by the S3 **website** endpoint
(`<bucket>.s3-website-<region>.amazonaws.com`), not the REST endpoint
(`<bucket>.s3.amazonaws.com`). So CloudFront must use the **website endpoint as a
custom origin** (`http-only`). If you're on the REST origin + OAC model, this
integration's objects won't be served as redirects — that's the main "do not use" case.

## The multi-tenant subtlety (why site-relative targets matter)

S3 computes the implicit directory redirect's `Location` from the **bucket root**.
Under Origin Path that leaks the tenant prefix (`/about` → `302 /<prefix>/about/`)
and double-prefixes into a 404. This integration sidesteps it: it writes a bare-key
object whose `WebsiteRedirectLocation` is a literal **site-relative** path
(`/about/`) — S3 returns it verbatim, so the prefix never appears. See
[`architecture.md`](./architecture.md).
