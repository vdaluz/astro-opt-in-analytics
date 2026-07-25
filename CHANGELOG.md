# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
