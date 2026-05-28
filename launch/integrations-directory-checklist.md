# Integrations-directory listing checklist

The Astro integrations library (https://astro.build/integrations/) is populated by a
**weekly npm scan** for the `astro-component`, `astro-integration`, or `withastro`
keyword. No manual submission form — publishing correctly *is* the submission.

- [x] `package.json` `keywords` includes **`astro-integration`** (+ category hints:
      `aws`, `s3`, `cloudfront`, `redirects`, `withastro`).
- [x] `name` follows the `astro-*` convention (`astro-s3-redirects`).
- [x] `description` is one clear sentence (shown in the directory card).
- [x] `homepage` / `repository` set (the card links to them).
- [x] `README` renders well on npm (badges, install, config, when-NOT-to-use).
- [ ] Published **public** to npm (see launch-plan step 1).
- [ ] After ≤1 week: confirm the card appears; fix description/keywords if the
      category or render is off, then re-publish a patch.

Special category keywords Astro recognizes can route the card into the right section;
keep them accurate (don't keyword-stuff).
