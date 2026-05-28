# Rule: Publishing an Astro integration

- **Name**: `astro-s3-redirects` (the `astro-*` community convention; matches the
  integration `name`).
- **`astro-integration` keyword is mandatory** — the Astro integrations directory does a
  weekly npm scan for it. Add category-hint keywords (`aws`, `s3`, `cloudfront`,
  `redirects`, `withastro`).
- **`package.json`**: `"type":"module"`; `exports` map with `types` **first**; `main`/`types`
  for older resolvers; `files:["dist","README.md","LICENSE"]`; `engines.node`.
- **peerDependencies**: declare a real, CI-tested `astro` range (e.g. `>=4 <7`). Optional
  runtime deps (`@aws-sdk/client-s3`) go in `peerDependencies` + `peerDependenciesMeta`
  `{ optional:true }`, and in `devDependencies` for tests.
- **Build**: ship compiled `dist/` (JS + `.d.ts` + maps). Never publish `src` as the entry.
- **Versioning**: **changesets**. Start `0.0.0`/`0.x` (pre-1.0 = API may change). SemVer.
- **`astro add` support**: zero-arg sensible defaults + a default export so `astro add`
  can wire it; always document the manual-install fallback.
- **Provenance**: publish with `--provenance` from CI when possible; MIT `LICENSE` included.
- Before first publish: `pnpm test && pnpm typecheck && pnpm build` green; README has the
  **when-NOT-to-use** matrix; `npm view astro-s3-redirects` confirms the name is yours.
