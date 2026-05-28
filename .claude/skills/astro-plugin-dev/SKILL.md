---
name: astro-plugin-dev
description: End-to-end workflow for developing, testing, publishing, and contributing a community Astro integration the way the Astro community expects. Use when building or releasing this (or any) Astro integration.
---

# Developing a community Astro integration (the respectful way)

A checklist + reference for shipping an Astro integration that meets the bar set by
`@astrojs/*` and the wider community. Pairs with the repo's `.claude/rules/astro-*.md`.

## 1. Shape
- Default export = factory `(options?) => AstroIntegration` (never a bare object).
- `name` matches the npm package. Hooks only from the documented set.
- Options validated with `zod`; types inferred and exported.
- Side-effect-free import; lazy-load heavy/optional deps (e.g. AWS SDK) inside the
  hook branch that needs them.

## 2. Hooks you'll likely use
- `astro:config:setup` — inject routes/scripts, add Vite plugins, update config.
- `astro:config:done` — read the *resolved* config; validate assumptions (warn, don't throw).
- `astro:build:done` — inspect `dir` + `routes`/`pages`; emit artifacts; optional side effects.

## 3. Testing (no real network/cloud)
- **Vitest**. `globals:true` for `aws-sdk-client-mock-jest/vitest` matchers.
- **Unit**: pure functions (planning/diffing) — fast, exhaustive edge cases.
- **Integration**: programmatic `build()` with `getViteConfig()` over `test/fixtures/*`
  Astro projects; assert emitted output/artifacts.
- **Cloud calls**: `aws-sdk-client-mock` — assert exact commands; never hit AWS.
- A `demo/` workspace project that uses the integration locally = the fastest dev loop.

## 4. Packaging & publishing
- `type:module`, `exports` (types first), `files:["dist"]`, `engines.node`.
- `peerDependencies`: `astro` (a real range you test in CI); optional peers marked in
  `peerDependenciesMeta`.
- **Keyword `astro-integration`** is mandatory — it's how the integrations directory
  finds you (weekly npm scan). Add category-hint keywords too.
- Versioning via **changesets**; MIT license; CHANGELOG generated.
- CI matrix across Node versions × the supported Astro range.

## 5. Discoverability & contribution
- Publish public to npm → appears in https://astro.build/integrations/ via the keyword.
- Announce in Astro Discord `#integrations` (concise, honest, links).
- Docs: Astro accepts third-party **deploy-guide** enhancements case-by-case
  (docs.astro.build/en/contribute/). Propose before PR; match their style.

## 6. Respect (what earns trust here)
- Document **when NOT to use** as prominently as when to use.
- Credit prior art and inspirations.
- Keep scope tight; don't bloat the integration with adjacent features.
- Honest semantics (a `301` is a `301`), honest caveats, no over-claiming.

## Commands
```bash
pnpm test            # vitest unit + integration (mocked AWS)
pnpm typecheck       # tsc --noEmit
pnpm build           # tsc → dist
pnpm changeset       # record a release
pnpm --filter demo build   # exercise the integration in a real Astro build
```
