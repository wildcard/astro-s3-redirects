# CI setup — applying redirects from your build pipeline

The integration runs inside `astro build`. In **`manifest`** mode it needs nothing
but the filesystem. In **`apply`** / **`reconcile`** mode it calls S3, so the build
environment needs a bucket, a region, and credentials.

## Configure via options or env

```js
// astro.config.mjs
integrations: [s3Redirects({ mode: 'reconcile', bucket: 'my-bucket', region: 'us-east-1' })]
```

…or keep the config clean and let CI drive it with env (options win; env fills gaps):

| Env var | Maps to |
|---|---|
| `S3_REDIRECTS_BUCKET` | `bucket` |
| `S3_REDIRECTS_PREFIX` | `prefix` (tenant prefix; empty = root) |
| `S3_REDIRECTS_REGION` / `AWS_REGION` | `region` |
| `S3_REDIRECTS_APPLY=1` | switch to apply/reconcile in CI without editing config |

> Env-fallback wiring is provided by the integration's option resolution; `manifest`
> mode remains the default so a build never touches AWS unless asked.

## Credentials (recommended: GitHub OIDC, not long-lived keys)

Grant a least-privilege role and assume it via OIDC:

```yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::<acct>:role/astro-s3-redirects-deployer
      aws-region: us-east-1
  - run: npm ci && npm run build   # build applies/reconciles redirects
```

Minimum IAM policy (scope the resource to your bucket/prefix):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:DeleteObject", "s3:GetObject", "s3:ListBucket"],
    "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"]
  }]
}
```

## Typical pipelines

**Single-tenant, blind apply alongside a destructive sync:**
```bash
npm run build                                   # mode: 'apply' (or manifest + a separate apply step)
aws s3 sync dist/ s3://my-bucket/ --delete
```

**Multi-tenant, state-backed reconcile (no destructive sync):**
```bash
S3_REDIRECTS_BUCKET=my-bucket S3_REDIRECTS_PREFIX=alpha/builds/site-aaaa \
S3_REDIRECTS_APPLY=1 npm run build              # reconcile per tenant; ownership-scoped deletes
aws s3 sync dist/ s3://my-bucket/alpha/builds/site-aaaa/   # content, no --delete
```

## Local testing against LocalStack

The E2E test (`test/e2e.localstack.test.ts`) targets a local S3 stack and **skips**
when it's down. To run it:

```bash
docker run -d --name asr-localstack -p 4566:4566 -e SERVICES=s3 localstack/localstack:3.0.2
npm test
docker rm -f asr-localstack
```

Notes: pin community `3.0.2` (newer `:latest` requires a pro token), and the test
sets `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` so LocalStack accepts the
SDK's PUTs (it rejects the default streaming-checksum trailer).
