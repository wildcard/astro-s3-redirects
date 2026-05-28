# Rule: Clean-room — no PoC code bleed

This integration is authored **from scratch, TDD**. The proof-of-concept under
`../multitenant/` (`apply-redirects.ts`, `apply-redirects.mjs`,
`astro-s3-redirects.mjs`, `pulumi-redirects.ts`, the shell scripts) is a **behavior
specification and evidence record only**.

## Do
- Read `../multitenant/README.md` and `../multitenant/EVIDENCE-S3ONLY.md` to understand
  the *required behavior* (object-redirect mechanism, site-relative targets,
  trailing-slash normalizers, state/reconcile semantics, ownership-scoped deletes).
- Re-derive the implementation here, test-first, with clean names and types.

## Don't
- Copy/paste any PoC source into `src/`.
- Import from `../multitenant/` at build or runtime.
- Carry over PoC-specific assumptions (the Haleiwa demo, hard-coded buckets/prefixes,
  the `_redirect-state/_root.json` literal layout) without re-justifying them via a test.

## Why
The PoC optimized for fast proof on one bucket; a published integration must be
minimal, general, typed, and regression-protected. Mixing the two erodes both.
A reviewer should be able to diff `src/` against the spec and see only intentional,
tested decisions — never inherited PoC residue.
