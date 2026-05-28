# Rule: Testing an Astro integration (TDD, no real cloud)

- **TDD**: write the failing test first, then the minimum `src/` to pass. Every behavior
  the README/use-case matrix claims must have a test.
- **Runner**: Vitest. `globals:true` (needed for `aws-sdk-client-mock-jest/vitest`
  matchers like `toHaveReceivedCommandWith`).
- **Three layers**:
  1. **Unit** (`test/plan.test.ts`): pure functions — meta-refresh detection, normalizer
     generation, prefix joining, edge cases (root skip, nested, dynamic routes,
     no-redirects, already-trailing-slash, query/hash safety).
  2. **Integration** (`test/build.integration.test.ts`): run Astro's programmatic
     `build()` (configured via `getViteConfig()`) over `test/fixtures/*` projects that
     declare `redirects{}`; assert the emitted manifest/plan against the real build output.
  3. **Cloud** (`test/reconcile.mock.test.ts`): `aws-sdk-client-mock` stubs `S3Client`;
     assert exact `PutObject`/`DeleteObjects`/`GetObject` commands. Cover: first-deploy
     (`NoSuchKey` → create all), idempotency (second run = 0 writes), update (changed
     target), delete (dropped redirect), ownership-scope (per-prefix state isolation),
     region propagation, batch-delete chunking (>1000).
- **Never hit real AWS or the network** in the suite. No live buckets, no credentials.
- **Fixtures** are minimal real Astro projects (their own `astro.config`), not mocks of Astro.
- **Coverage** thresholds enforced in `vitest.config.ts` (lines/functions ≥ 90).
- The one real-AWS check (apply against the PoC bucket) is a **manual gate**, documented
  in `docs/ci-setup.md`, and **excluded from CI**.
