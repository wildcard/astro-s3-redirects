# Rule: Astro Integration API conventions

- **Factory function** default export: `export default function s3Redirects(opts?): AstroIntegration`.
- Return `{ name, hooks }`. `name` MUST equal the npm package name (`astro-s3-redirects`).
- Use only **documented hooks**. This integration uses:
  - `astro:config:done({ config, logger })` — validate `config.output === 'static'`
    and `config.build.format === 'directory'`; on mismatch **`logger.warn`, never throw**.
  - `astro:build:done({ dir, routes, logger })` — derive the redirect plan from the
    built output and emit artifacts / optionally apply.
- **Pure core**: planning/diffing logic lives in `src/plan.ts` / `src/reconcile.ts` as
  pure, individually-testable functions. Hooks are thin adapters.
- **Lazy-load optional deps**: `await import('@aws-sdk/client-s3')` only inside the
  apply/reconcile branch. Importing the integration must have no AWS side effects.
- **Options**: validate with `zod` in `src/config.ts`; export the inferred type.
- **Logging** via the provided `logger` (auto-prefixed with the integration name).
  No `console.log` in `src/`.
- **No throwing for user-config issues** the build can survive; throw only for genuine
  programmer/credential errors with an actionable message.
