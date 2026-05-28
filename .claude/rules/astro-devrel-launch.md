# Rule: DevRel / launch into the Astro ecosystem

- **Gate the launch on quality**: green CI, README with the when-NOT matrix, MIT,
  changeset, `astro-integration` keyword. No launch before these.
- **Discoverability is automatic**: publishing public to npm with the `astro-integration`
  keyword lists you in https://astro.build/integrations/ (weekly scan). Verify it appears;
  fix description/keywords if the category/render is off.
- **Announce once, honestly**: Astro Discord `#integrations` — one concise post: what it
  does, the use-case matrix (esp. when NOT), repo + npm links. No cross-posting spam.
- **Engage roadmap [#319](https://github.com/withastro/roadmap/discussions/319)**: a
  factual note that this fills the static-S3 redirect gap the thread identified.
- **Credit prior art** in every public artifact (gatsby-plugin-s3, jekyll-s3, s3_website, Hugo).
- **Be a good citizen**: no self-promotion in unrelated threads; respond to issues;
  keep scope tight; don't imply official/blessed status you don't have.
- **Docs contribution is the finale**, not the opener: only after the package is public
  and stable, hand off to `astro-docs-writer` for the Deploy-to-AWS guide enhancement.
