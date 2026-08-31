# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.8.0] - 2026-08-31

### Added

- `ConsentPrompt` accepts a new optional `placement?: 'corner' | 'bar'` prop (default `'corner'` - no behavior change for existing consumers). `'bar'` renders a full-width bottom bar above 640px for sites whose centered article column leaves no gutter wide enough for the corner card (message left, two equal-width buttons right), scoped so it never overrides the existing sub-640px mobile sheet. While a `'bar'`-placement prompt is visible, `scroll-padding-bottom` is set on the document root to its measured height so keyboard focus landing on an occluded in-page link scrolls it into view above the bar (SC 2.4.11) - cleared once the prompt is answered or dismissed.

## [0.7.1] - 2026-08-22

### Fixed

- README Consumers list was missing freetoolbox.net, which already depends on and uses the package.
- Added `"sideEffects": false` to `package.json`, matching the other four `@vdaluz/astro-*` packages - every module's DOM/script-injecting code is gated behind an explicit function call (`bootConsentGate`, `bootConsentPrompt`), never run at import time, so this is safe for bundler tree-shaking.

### Removed

- Dropped the tarball-install alternative from the README - every consumer moved to npm-registry semver pins, and the tarball block's hardcoded version tag had drifted from the published version.

### Documentation

- Added npm version and license badges. Standardized the README's tail-section order (Contributing, Consumers, License).

## [0.7.0] - 2026-08-08

### Changed

- **Breaking:** `umami()` no longer injects the official Umami tracker script. That script gates its own init on `document.currentScript`, which is `null` for a script this package injects dynamically after consent - so it silently never initialized (confirmed live on vdaluz.com, imperfectsystems.com, and wq1k.com; real end-user traffic was still being tracked in practice, but the failure mode made the package untestable and would bite the moment that stopped being true). `umami()` now posts pageviews and events directly to Umami's documented `/api/send` endpoint instead, reimplementing the session-cache handshake, domain filtering, and Do Not Track handling the official script did internally.
- `UmamiOptions`' free-form `extra` attribute bag is replaced with typed options: `domains?: string[]` (was `extra['data-domains']`, a comma-joined string), `excludeSearch?: boolean` (was `extra['data-exclude-search']`), `excludeHash?: boolean`, `respectDoNotTrack?: boolean` (default `true`, was `extra['data-do-not-track']`). Update any consumer config using `extra` on `umami()`.
- `cloudflareBeacon()` is unchanged - it has no `document.currentScript` dependency and continues to load via an injected `<script>` tag.

## [0.6.0] - 2026-08-08

### Added

- `trackEvent(name, data?)` (from `./client`): reports a consent-gated custom event to Umami, no-op on other/no trackers.
- `bindAffiliateClickTracking()`, wired in automatically by `bootConsentGate()`: reports an `affiliate-click` event for any `[data-affiliate-key]` anchor on the page (see `@vdaluz/astro-affiliate`'s `<AffiliateLink>`).

## [0.5.5] - 2026-07-25

### Documentation

- Documented `PrivacyExplainer`'s Tailwind dependency in the Styling section - it's styled with Tailwind token utility classes, not CSS custom properties like the rest of the package, so it needs the token color aliases and a `content` glob entry in the consuming app's Tailwind config or it renders unstyled.

## [0.5.4] - 2026-07-25

### Fixed

- `ConsentGate`/`ConsentPrompt` now re-run their setup on every `astro:page-load`, so a `<ClientRouter />` (view transitions) navigation correctly rebinds the fresh prompt's accept/decline buttons and re-reveals it - previously they only bootstrapped once per full page load, going dead after the first client-side navigation. Also fixes a stale-closure bug where the footer "Analytics preferences" reopen button targeted the original page's (by then detached) prompt element instead of the current one, and a related timer/listener leak in the mobile scroll-or-idle reveal path.

## [0.5.3] - 2026-07-25

### Added

- `repository`, `homepage`, `bugs`, and `keywords` fields to `package.json` for GitHub/npm discoverability. `sideEffects` deliberately left unset - `ConsentGate`/`ConsentPrompt` register listeners at module load, a real side effect a bundler could otherwise strip.
- This CHANGELOG, backfilled from tag history.

## [0.5.2] - 2026-07-25

### Changed

- Fixed a stale install-tag pin in the README, added a Contributing section and a real ConsentPrompt example screenshot.

### Added

- CI (typecheck + tests) via GitHub Actions.

## [0.5.1] - 2026-07-24

### Added

- Portuguese (pt) strings for `PrivacyExplainer`.

## [0.5.0] - 2026-07-17

### Fixed

- Deferred the mobile prompt reveal until scroll or a 3-second idle, instead of showing immediately.

## [0.4.1] - 2026-07-17

### Fixed

- `cloudflareBeacon()` now defaults its script tag to `type="module"`.

### Changed

- Added a Consumers section to the README.

## [0.4.0] - 2026-07-17

### Added

- `PrivacyExplainer` component and a `cloudflareBeacon` adapter.

## [0.3.0] - 2026-07-13

### Changed

- Made the consent prompt more visually prominent.

## [0.2.0] - 2026-07-12

### Added

- Locale-aware prompt copy for i18n consumers.

## [0.1.2] - 2026-07-10

### Fixed

- Tokens are now consumed as RGB channel triplets, matching the `@vdaluz/astro-blog` token contract.

## [0.1.1] - 2026-07-10

### Added

- Support for multiple tracker adapters at once.

## [0.1.0] - 2026-07-10

### Added

- Initial release: consent-first analytics for Astro, an opt-in prompt, a script gate, and zero tracking requests until the visitor says yes.
