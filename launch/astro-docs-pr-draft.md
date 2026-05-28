# Astro docs PR draft — "Deploy to AWS" enhancement

Target: an addition to **docs.astro.build/en/guides/deploy/aws/** (the existing
"Deploy your Astro Site to AWS" guide). Propose in the docs contribution channel
first; Astro accepts third-party deploy content case-by-case. Style follows the
docs voice guide (second person, present tense, no marketing language).

> Note: Astro docs don't host per-integration pages — third-party integrations live
> in their own repos and the integrations directory. This is a *guide enhancement*
> that links the integration, not a new core page.

---

## Proposed section (insert under the S3 + CloudFront subsection)

### Handling redirects and trailing slashes on S3

S3 static website hosting serves an `index.html` for a directory request
(`/about/` → `about/index.html`), but it has no built-in support for Astro's
[configured redirects](/en/guides/routing/#configured-redirects): on a static
build those become meta-refresh HTML pages (an HTTP `200` plus a client-side
hop), and a request without a trailing slash relies on S3's own `302`.

To serve real `301` redirects from S3 — including for Astro's `redirects` config —
store the redirect as an S3 object with the `x-amz-website-redirect-location`
metadata. The community integration
[`astro-s3-redirects`](https://github.com/wildcard/astro-s3-redirects) does this
automatically at build time:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import s3Redirects from 'astro-s3-redirects';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects: { '/old-page/': '/new-page/' },
  integrations: [s3Redirects()],
});
```

By default it writes a manifest your deploy step applies; it can also push the
objects directly. This requires your CloudFront distribution to use the S3
**website** endpoint as a custom origin (the REST endpoint ignores
`x-amz-website-redirect-location`). See the integration's README for credentials,
multi-tenant prefixes, and when not to use it.

---

## PR checklist (when submitting to withastro/docs)
- [ ] Fork `withastro/docs`; edit `src/content/docs/en/guides/deploy/aws.mdx`.
- [ ] Keep the addition concise and link the integration rather than inlining it.
- [ ] Run the docs site locally; check the build + the page renders.
- [ ] Open the PR referencing the prior discussion in the docs contribution channel.
