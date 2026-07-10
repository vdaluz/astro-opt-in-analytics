# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`@vdaluz/astro-opt-in-analytics`: consent-first analytics for Astro sites. An opt-in prompt, a consent gate, and a tracker adapter (Umami first). The tracker script is injected only after an explicit stored grant; denied, unanswered, or a Global Privacy Control signal means zero requests. Consumed by vdaluz.com and imperfectsystems.com as a pinned https-tarball dependency.

## Workflow

**No worktrees.** Work directly on `main` - this repo is small, single-maintainer, and worked sequentially. Consumers only ever see tagged releases, so `main` is safe to iterate on.

## Conventions

- **Raw source, no build step.** Ships `.ts` and `.astro` from `src/`; the consuming app's Astro/Vite compiles them. Never add a build/dist step or `main` field.
- **Per-path exports.** Components are exposed via the `exports` map in `package.json` (`./ConsentGate.astro`, `./ConsentPrompt.astro`, `./client`). New public files need an exports entry.
- **Token-driven styling.** The prompt reads only these CSS custom properties, same contract as @vdaluz/astro-blog: `--surface`, `--fg`, `--border`, `--accent`, `--on-accent`, with values as **R G B channel triplets** consumed via `rgb(var(--name, fallback))`. Never use whole-color var() values (a triplet resolves to an invalid color and the declaration is silently dropped - found the hard way in IPS-149) and never hardcode site colors beyond the fallback triplets.
- **No dark patterns.** The prompt's UX constraints (equal-weight buttons, decline first in DOM, dismissal = deny, no overlay, no scroll lock, GPC = auto-deny without prompting) are the product. Do not make them configurable, do not weaken them on request without the maintainer explicitly overriding this file.
- **No tracking data in this repo.** Site IDs, endpoints, and prompt copy live in each consumer's config, never here.
- **SSR-safe modules.** `src/lib/consent.ts` takes storage/navigator as parameters and must never touch `window` at import time. Only `src/lib/client.ts` may assume a browser.

## Release process

Same as @vdaluz/astro-blog (tag-pinned tarballs, no registry):

1. Test before tagging: `npm pack`, install the tarball into a scratch Astro app, `astro check && astro build`.
2. Bump `version` in `package.json`, commit.
3. Tag `vX.Y.Z` and push the tag. **The tag must be public before any consumer CI references it** - the tarball URL 404s otherwise.
4. Bump the tag in each consumer's `package.json` dependency URL.

## Consumers

- imperfectsystems.com (`src/config/analytics.ts`)
- vdaluz.com (`src/config/analytics.ts`)
