# Releasing

`astro-s3-redirects` ships via a **test-gated [Changesets](https://github.com/changesets/changesets)
flow**: every change carries a changeset; merging the auto-generated **Version
Packages** PR bumps the version, writes the `CHANGELOG`, tags, creates a **GitHub
Release**, and **publishes to npm with provenance**.

## Versioning strategy — SemVer, pre-1.0 (`0.x`)

While the package is `0.x` the API may still move:

| Bump | When | Example |
|---|---|---|
| `patch` | bug fixes, docs, internal refactors | `0.1.0 → 0.1.1` |
| `minor` | new features **and any breaking change** (allowed pre-1.0) | `0.1.1 → 0.2.0` |
| `major` | reserved — we stay below `1.0.0` until the API is stable | — |

We will cut `1.0.0` only when the options/behavior are considered stable.

## Day-to-day: add a changeset with your PR

```bash
npx changeset           # pick the bump (patch/minor) and write a one-line note
git add .changeset && git commit -m "chore: changeset"
```
Open the PR as usual. CI runs the **`test`** matrix (Node 18/20/22 × Astro ^4/^5)
and the **`e2e`** job (the full LocalStack S3 flow). Both must be green.

## How a release happens

1. On every push to `main`, the **Release** workflow runs Changesets.
2. With pending changesets, it opens/updates a **"Version Packages"** PR
   (bumped `package.json` + generated `CHANGELOG.md`).
3. **Merging that PR** (no pending changesets remain) triggers the workflow to:
   - run `typecheck + test + build` (the publish is gated on green),
   - `git tag` the version + **create a GitHub Release** (notes from the CHANGELOG),
   - `npm publish` **with provenance** (a verified build attestation).

The `astro-integration` keyword means the published package is picked up by the
Astro integrations directory on its weekly npm scan.

## One-time setup (maintainer)

- **Repo public** (required for npm provenance + the directory listing):
  `gh repo edit wildcard/astro-s3-redirects --visibility public`
- **npm token**: create a *granular automation token* with publish rights for
  `astro-s3-redirects`; add it as the repo secret **`NPM_TOKEN`**.
- **(Optional) Branch protection** on `main` requiring the `test` and `e2e` checks.

## Local rehearsal (no publish)

```bash
npx changeset status                 # what would be released
npm run build && npm publish --dry-run   # tarball contents + provenance flag
npm test                             # full suite (LocalStack E2Es skip without Docker)
RUN_FULL_E2E=1 npm test              # with `docker run … localstack:3.0.2` up
```
