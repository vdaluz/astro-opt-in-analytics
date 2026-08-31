---
paths:
  - "package.json"
  - "astro.config.*"
  - "src/**"
---

<!-- Synced by hand across the @vdaluz/astro-* package family - not generated or symlinked. -->

## Shared @vdaluz/astro-* package conventions

- **Raw source, no build step.** Ships `.ts` and `.astro` from `src/`; the consuming app's Astro/Vite compiles them. Never add a build/dist step or `main` field.
- **Per-path exports.** Components are exposed via the `exports` map in `package.json`. New public files need an exports entry.

These 2 conventions are the genuinely shared core across the `@vdaluz/astro-*` package family.
Everything else (`.ts`-extension requirements, dependency-free vs. one-runtime-dependency,
token-styling contracts, consent-gate rules, etc.) varies meaningfully per package - each
package's own CLAUDE.md documents its own real conventions beyond these 2, not duplicated
boilerplate.
