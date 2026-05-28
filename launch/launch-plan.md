# Launch plan

Community-first, gated each step on the previous. Owned by the `astro-devrel` agent.

## 0. Pre-flight (done in M0–M4)
- [x] Clean-room TDD package; full suite green (incl. LocalStack S3 E2E).
- [x] README with the **when-NOT-to-use** matrix; `docs/` deep dives; runnable `demo/`.
- [x] `astro-integration` keyword + `exports` + `files` + MIT + changeset.
- [x] CI matrix (Node 18/20/22 × Astro ^4/^5) + changesets release workflow.

## 1. Publish to npm (HUMAN-GATED — needs npm auth + the name)
```bash
npm whoami                      # confirm logged in (else: npm login)
npm publish --access public --provenance
```
Or merge the changesets "Version Packages" PR and let `release.yml` publish with
`NPM_TOKEN`. Pre-1.0 (`0.x`) signals the API may still change.

## 2. Verify the integrations-directory listing
The Astro integrations library scans npm **weekly** for the `astro-integration`
keyword. After publish, confirm `astro-s3-redirects` appears at
https://astro.build/integrations/ and that its description/keywords render well.
See `integrations-directory-checklist.md`.

## 3. Announce (Astro Discord `#integrations`)
One concise post: what it does, the use-case matrix (esp. *when not*), repo + npm
links. Engage roadmap [#319](https://github.com/withastro/roadmap/discussions/319)
with a factual note that this fills the static-S3 redirect gap. Credit prior art.

## 4. Docs contribution (HUMAN-GATED — withastro/docs PR)
Submit the `astro-docs-pr-draft.md` enhancement to the "Deploy to AWS" guide.
Propose in the docs contribution channel first (case-by-case acceptance), then PR.

## 5. Optional
Short blog/showcase post of the use case + prior art.

## What needs the user
- npm credentials (`npm login` or `NPM_TOKEN` secret) + flipping the repo public if desired.
- Opening the withastro/docs PR (external repo; their process).
