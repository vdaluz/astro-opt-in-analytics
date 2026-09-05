# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.9.0] - 2026-09-04

### Added

- `PromptCopy` gained an optional `learnMore?: { href: string; text: Localized }` field - renders as a plain inline text link right after the message, never a third button, so the equal-weight accept/decline invariant stays intact. Lets a consumer point the prompt itself at the `/privacy` page `PrivacyExplainer` builds, instead of relying on the visitor to find a footer link first.
- `PromptCopy.label`'s built-in fallback (shown when a consumer omits `label` entirely) is now localized (en/es/pt), matching `PrivacyExplainerStrings`' existing pattern - it was previously hardcoded English (`'Analytics consent'`) even on an otherwise fully localized prompt.
- `consentMaxAgeDays` config option (default 365): a stored consent decision now expires and re-prompts the visitor after this many days, matching EU regulator guidance that consent has a shelf life. Applies to a decline too, not just a grant. Set `0` or `Infinity` to disable expiry entirely. In practice this affects nothing yet - the package shipped roughly 3 months ago, so no stored decision is anywhere near a year old.
- `PrivacyExplainer` accepts a new `strings?: Partial<PrivacyExplainerStrings>` prop - every heading, body, and bullet it renders can now be overridden (e.g. for a fourth locale, or to correct a claim the built-in copy can't know about your setup). `PrivacyExplainerStrings` is exported for typing your overrides.
- `TrackerPrivacyInfo` gained an optional `collects?: Localized[]` field, rendered as a trailing "Also collects: ..." clause on that tool's entry in the "tools behind it" list - lets a custom tracker disclose data points beyond the package-wide baseline. Neither bundled adapter sets a default value for it (see Fixed, below, for why `umami()` doesn't need one).

### Fixed

- `bootConsentGate()` evaluated the bare `localStorage` global directly, outside `readConsent`/`writeConsent`'s own throw-handling. In any browser with cookies/site data blocked (and some sandboxed iframes), merely reading `window.localStorage` throws a `SecurityError` before either function is entered - the gate died with an uncaught exception, `data-oia-state` was never stamped, and the affiliate-click listener never bound. A new `safeStorage()` helper now guards that access; when storage is inaccessible the gate still works, just un-persisted - the decision applies for the current page view only, then the visitor is asked again next time.
- `PrivacyExplainer`'s default "what's collected" copy claimed the visit is counted as "the page you viewed, the referring site, and a general device/browser type. That's it." - but the `umami()` adapter's sender also reports browser language and screen resolution, neither of which was disclosed. The default copy now names both. **This changes the rendered text on any site using `PrivacyExplainer` with its default strings**, not just new installs.
- `ConsentPrompt`'s scroll-padding-bottom mitigation for SC 2.4.11 only ever applied to `placement="bar"` - `'corner'` (the package default) and the <=640px mobile sheet were both silently skipped, on the assumption that neither covers enough of the viewport to hide a focusable element. That assumption is false on a short page: a footer link tabbed to can land fully behind the corner card or the mobile sheet with no scroll adjustment at all. The mitigation now applies to every placement, correctly accounting for the corner card's `inset-block-end` offset (height alone under-reserves by that amount) and immune to the entrance-animation transform (measured via computed `inset-block-end`, not a transform-affected rect). **This changes runtime behavior for every `'corner'`-placement consumer** (the package default) on next release - freetoolbox.net, vicstradamus.com, and wq1k.com are all still on `@vdaluz/astro-opt-in-analytics@^0.7.x`, which renders `corner` today.
- On <=640px widths, opening the prompt early (via `openConsentPrompt()` or a `[data-open-analytics-prompt]` element) and deciding before the deferred-reveal timer/scroll listener fired left that timer armed - it would then re-show the already-decided prompt. A soft ClientRouter navigation to a page with no prompt had the same gap: the old page's pending reveal timer stayed armed against the now-detached element and could re-apply `scroll-padding-bottom` on the new page moments after navigating. Both now go through a small cancellation helper that always self-nulls once fired.

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
