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
- **Explicit `.ts` extensions on relative imports.** Required for `node --test` to resolve them directly without a bundler - without it, the package's own public barrel (`src/index.ts`) can be unimportable under Node even though `astro build` tolerates the omission.

These 3 conventions are the genuinely shared core across the `@vdaluz/astro-*` package family.
Everything else (dependency-free vs. one-runtime-dependency, token-styling contracts,
consent-gate rules, etc.) varies meaningfully per package - each package's own CLAUDE.md
documents its own real conventions beyond these 3, not duplicated boilerplate.
