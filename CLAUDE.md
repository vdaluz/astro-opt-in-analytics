# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`@vdaluz/astro-opt-in-analytics`: consent-first analytics for Astro sites. An opt-in prompt, a consent gate, tracker adapters (`umami`, `cloudflareBeacon`), and a `PrivacyExplainer` component that renders a `/privacy` page's substantive copy straight from the tracker config. The tracker script is injected only after an explicit stored grant; denied, unanswered, or a Global Privacy Control signal means zero requests. Consumed by vdaluz.com and imperfectsystems.com as a pinned https-tarball dependency.

## Workflow

**No worktrees.** Work directly on `main` - this repo is small, single-maintainer, and worked sequentially. Consumers only ever see tagged releases, so `main` is safe to iterate on.

## Conventions

- **Raw source, no build step.** Ships `.ts` and `.astro` from `src/`; the consuming app's Astro/Vite compiles them. Never add a build/dist step or `main` field.
- **Per-path exports.** Components are exposed via the `exports` map in `package.json` (`./ConsentGate.astro`, `./ConsentPrompt.astro`, `./PrivacyExplainer.astro`, `./client`). New public files need an exports entry.
- **`TrackerPrivacyInfo` is optional metadata, not injection config.** `privacyInfo` on a `TrackerAdapter` only feeds `PrivacyExplainer`'s "tools behind it" list - `ConsentGate.astro` serializes only `scriptAttributes` into the injected payload, so this field must never affect what loads on the page.
- **Token-driven styling.** The prompt reads only these CSS custom properties, same contract as @vdaluz/astro-blog: `--surface`, `--fg`, `--border`, `--accent`, `--on-accent`, with values as **R G B channel triplets** consumed via `rgb(var(--name, fallback))`. Never use whole-color var() values (a triplet resolves to an invalid color and the declaration is silently dropped) and never hardcode site colors beyond the fallback triplets.
- **No dark patterns.** The prompt's UX constraints (equal-weight buttons, decline first in DOM, dismissal = deny, no overlay, no scroll lock, GPC = auto-deny without prompting) are the product. Do not make them configurable, do not weaken them on request without the maintainer explicitly overriding this file.
- **No tracking data in this repo.** Site IDs, endpoints, and prompt copy live in each consumer's config, never here.
- **SSR-safe modules.** `src/lib/consent.ts` takes storage/navigator as parameters and must never touch `window` at import time. Only `src/lib/client.ts` may assume a browser.

## Release process

Same tag-pinned-tarball process shared by all `@vdaluz/*` component libraries — see root
`~/Repos/CLAUDE.md` → "Astro shared-library release process".

## Consumers

- imperfectsystems.com (`src/config/analytics.ts`)
- vdaluz.com (`src/config/analytics.ts`)
