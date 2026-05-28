import { defineConfig } from 'astro/config';
import s3Redirects from '../../../src/index.ts';

// Fixture: exercises the integration inside a real `astro build` (manifest mode).
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects: { '/me/': '/about/' },
  integrations: [
    s3Redirects({ manifestPath: new URL('./.manifest.json', import.meta.url).pathname }),
  ],
});
