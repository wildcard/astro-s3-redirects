# astro-s3-redirects

## 0.1.0

### Minor Changes

- [`36f913e`](https://github.com/wildcard/astro-s3-redirects/commit/36f913ea7e2e279b3c8fd6db41fa8937680146ac) Thanks [@wildcard](https://github.com/wildcard)! - Initial release. Astro integration that materializes Astro `redirects` + directory
  routes as real S3 301 object-redirects for AWS S3 website hosting — no Lambda@Edge,
  no CloudFront Functions, no extra AWS resources. Modes: manifest (default, zero AWS),
  apply, and state-backed reconcile (ownership-scoped, idempotent).

All notable changes are documented in this file.

It is managed automatically by [Changesets](https://github.com/changesets/changesets):
contributors add a changeset with `npx changeset`, and the entry is written here
(with PR/author links) when the **Version Packages** PR is merged and the release
publishes. See [`RELEASING.md`](./RELEASING.md).
