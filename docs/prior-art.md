# Prior art & inspiration

The core trick — **an empty S3 object + `x-amz-website-redirect-location` = a `301`** —
is long-established across the static-site ecosystem. This integration brings it to
**Astro** (where no such plugin existed) and adds **multi-tenant prefix-safety**,
**trailing-slash normalization**, and **state-backed reconciliation**.

| Project | How it does redirects on S3 | Notes |
|---|---|---|
| [`gatsby-plugin-s3`](https://github.com/gatsby-uc/gatsby-plugin-s3) | `generateRedirectObjectsForPermanentRedirects` — empty object + `WebsiteRedirectLocation` for `301`s | Closest analog. Uses routing rules only for `302`s, *because S3 caps routing rules* — same reason we prefer objects. |
| [`jekyll-s3` / `jekyll-redirect-from`](https://github.com/laurilehmijoki/jekyll-s3) | `--website-redirect` on generated stub pages | `redirect_from` front matter → stub → `301`. |
| [`s3_website`](https://github.com/laurilehmijoki/s3_website) | redirect config → S3 website redirects | Manages the whole S3 website + CloudFront. |
| Hugo aliases → S3 (community scripts) | convert Hugo alias pages to S3 redirect objects | e.g. Cavelab's "Turning Hugo aliases into AWS S3 redirects". |

## Astro lineage

Astro roadmap discussion [#319](https://github.com/withastro/roadmap/discussions/319)
is the origin of the built-in `redirects` feature. Maintainers chose an
**integration-first** approach and floated a community `astro-redirect` package.
The built-in landed (meta-refresh on static); this integration fills the remaining
gap for **AWS S3 deploys**: turning those meta-refresh pages into real `301`s.

## What's new here

1. **Astro** support (the four tools above cover Gatsby/Jekyll/Hugo, not Astro).
2. **Multi-tenant prefix-safety** — site-relative targets that survive CloudFront Origin Path.
3. **Trailing-slash normalization** for *every* route, not just declared redirects.
4. **State + reconcile** — IaC-style create/update/delete with ownership-scoped deletes.
