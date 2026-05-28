---
"astro-s3-redirects": minor
---

Initial release. Astro integration that materializes Astro `redirects` + directory
routes as real S3 301 object-redirects for AWS S3 website hosting — no Lambda@Edge,
no CloudFront Functions, no extra AWS resources. Modes: manifest (default, zero AWS),
apply, and state-backed reconcile (ownership-scoped, idempotent).
