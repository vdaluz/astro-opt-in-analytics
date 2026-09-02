# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`@vdaluz/astro-opt-in-analytics`: consent-first analytics for Astro sites. An opt-in prompt, a consent gate, tracker adapters (`umami`, `cloudflareBeacon`), and a `PrivacyExplainer` component that renders a `/privacy` page's substantive copy straight from the tracker config. Trackers activate only after an explicit stored grant; denied, unanswered, or a Global Privacy Control signal means zero requests. Consumed by vdaluz.com, imperfectsystems.com, wq1k.com, freetoolbox.net, and vicstradamus.com (Cloudflare Beacon only) as an npm-registry semver pin.

## Workflow

Shared preamble: `.claude/rules/git-workflow-direct-to-main.md`.

## Conventions

Shared `@vdaluz/astro-*` conventions (raw source/no build step, per-path exports, `.ts` extensions on relative imports):
`.claude/rules/astro-package-conventions.md`. This package's exports map:
`./ConsentGate.astro`, `./ConsentPrompt.astro`, `./PrivacyExplainer.astro`, `./client`.

- **`TrackerPrivacyInfo` is optional metadata, not injection config.** `privacyInfo` on a `TrackerAdapter` only feeds `PrivacyExplainer`'s "tools behind it" list - `ConsentGate.astro` never serializes it into the client-side payload, so this field must never affect what loads on the page.
- **`umami()` does not inject a script tag.** It posts directly to Umami's `/api/send` (see README's "Why Umami skips the official script") because the official script's `document.currentScript`-based init is null for a dynamically-inserted script and it silently no-ops. `cloudflareBeacon()` still injects a real `<script>` tag - the two adapter kinds are genuinely different (`TrackerAdapter` is a discriminated union, `kind: 'script' | 'umami-api'`), not just different config for the same mechanism.
- **Token-driven styling.** The prompt reads only these CSS custom properties, same contract as @vdaluz/astro-blog: `--surface`, `--fg`, `--border`, `--accent`, `--on-accent`, with values as **R G B channel triplets** consumed via `rgb(var(--name, fallback))`. Never use whole-color var() values (a triplet resolves to an invalid color and the declaration is silently dropped) and never hardcode site colors beyond the fallback triplets.
- **No dark patterns.** The prompt's UX constraints (equal-weight buttons, decline first in DOM, dismissal = deny, no overlay, no scroll lock, GPC = auto-deny without prompting) are the product. Do not make them configurable, do not weaken them on request without the maintainer explicitly overriding this file.
- **No tracking data in this repo.** Site IDs, endpoints, and prompt copy live in each consumer's config, never here.
- **SSR-safe modules.** `src/lib/consent.ts` takes storage/navigator as parameters and must never touch `window` at import time. Only `src/lib/client.ts` may assume a browser.

## Release process

Same tag-then-npm-publish process shared by all `@vdaluz/*` component libraries, consumed via
npm-registry semver pins (not tarball URLs). See the README's "Releasing" section for the
concrete steps.

## Consumers

- imperfectsystems.com (`src/config/analytics.ts`)
- vdaluz.com (`src/config/analytics.ts`)
- wq1k.com (`src/config/analytics.ts`)
- freetoolbox.net (`src/config/analytics.ts`)
- vicstradamus.com (`src/config/analytics.ts`, `cloudflareBeacon()` only)
