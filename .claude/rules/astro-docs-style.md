# Rule: Astro docs style (README + Astro-docs contribution)

Write docs that could live on docs.astro.build.

- **Voice**: second person ("you"), present tense, concise, friendly, **no marketing
  adjectives**. Explain the goal before the mechanism.
- **Code**: complete, copy-pasteable, language-tagged; show the `astro.config.mjs`
  context. Prefer real output over prose claims.
- **Tables** for options, modes, comparisons. Always include **"when NOT to use"** —
  honest boundaries are valued in this community.
- **Correct semantics**: a `301` is a `301`; meta-refresh is `200`+client hop; say so.
- **Link** canonical Astro pages (routing/#configured-redirects, guides/deploy/aws,
  integrations) rather than restating them.
- **Astro-docs PR specifics**:
  - Target: an enhancement to the existing **"Deploy your Astro Site to AWS"** guide
    (a focused "redirects & trailing slashes on S3" section), not a new per-integration
    page (Astro docs don't host those).
  - Read `docs.astro.build/en/contribute/` first; follow their PR + style guide.
  - Keep it vendor-neutral in tone; link the integration, don't inline it wholesale.
  - Propose in the docs contribution channel before opening the PR (case-by-case acceptance).
