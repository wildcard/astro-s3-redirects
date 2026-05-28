import { defineConfig } from 'astro/config';
import s3Redirects from '../src/index.ts';

// Runnable demo. From the repo root:  npx astro build --root demo
// Manifest mode (default) writes demo/.astro-s3-redirects.json — zero AWS.
// To push to a bucket:  S3_REDIRECTS_BUCKET=my-bucket S3_REDIRECTS_APPLY=1 npx astro build --root demo
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects: {
    '/old-home/': '/',
    '/docs/': '/about/',
  },
  integrations: [
    s3Redirects({ manifestPath: new URL('./.astro-s3-redirects.json', import.meta.url).pathname }),
  ],
});
