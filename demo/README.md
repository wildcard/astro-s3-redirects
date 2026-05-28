# Demo

A minimal Astro site that uses `astro-s3-redirects`. Run from the **repo root**:

```bash
npx astro build --root demo
cat demo/.astro-s3-redirects.json   # the manifest the integration emitted
```

You'll see content redirects for `/old-home/` and `/docs/`, plus a trailing-slash
normalizer for `/about/` — all with site-relative targets.

Push to a real bucket (apply/reconcile mode):

```bash
S3_REDIRECTS_BUCKET=my-bucket S3_REDIRECTS_REGION=us-east-1 S3_REDIRECTS_APPLY=1 \
  npx astro build --root demo
aws s3 sync demo/dist/ s3://my-bucket/   # upload the page content
```

See `../docs/ci-setup.md` for credentials and the multi-tenant (prefix) flow.
