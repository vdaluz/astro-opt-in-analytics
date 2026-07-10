# @vdaluz/astro-opt-in-analytics

Consent-first analytics for Astro. The tracker script does not exist on the page until the visitor says yes: no requests, no fingerprinting surface, nothing to block. An opt-in prompt asks once, the answer is remembered, and refusing is exactly as easy as accepting.

Built for [Umami](https://umami.is) first, with a small adapter interface for other trackers. Ships raw `.astro` and `.ts` - the consuming app's Astro/Vite compiles them (no prebuild step).

## Why opt-in

Most "privacy-respecting analytics" setups still track by default and put the burden of blocking on the visitor. This package flips the default: tracking is off until a real yes. That costs you data. That is the point.

- **Zero requests until consent.** The script tag is injected only after a stored grant. Denied or unanswered means it never exists.
- **[Global Privacy Control](https://globalprivacycontrol.org/) is an answer.** `navigator.globalPrivacyControl === true` counts as a no. The prompt never shows; asking again would be its own dark pattern.
- **Anti-dark-pattern by construction.** Equal-weight buttons, decline first in DOM order, Esc or dismissal means deny, no overlay, no scroll lock. These are hard-coded, not configurable.
- **Changeable, both directions.** `openConsentPrompt()` (or any element with `data-open-analytics-prompt`) reopens the prompt, e.g. from a footer "Analytics preferences" link.

## Install

Pinned https tarball from a tag (no registry needed):

```jsonc
// package.json
"dependencies": {
  "@vdaluz/astro-opt-in-analytics": "https://github.com/vdaluz/astro-opt-in-analytics/archive/refs/tags/v0.1.0.tar.gz"
}
```

> **Why a tarball, not `github:...`?** npm canonicalizes GitHub shorthand to `git+ssh://` in the lockfile, and CI runners without SSH keys fail to clone it. The archive URL is anonymous https with an integrity hash. Bump the tag in the URL to upgrade.

Peer dependency: `astro` >= 6.

## Use

```ts
// src/config/analytics.ts
import { defineAnalyticsConfig, umami } from '@vdaluz/astro-opt-in-analytics';

export const analytics = defineAnalyticsConfig({
  tracker: umami({
    src: 'https://umami.example.net/script.js',
    websiteId: '00000000-0000-0000-0000-000000000000',
    extra: { 'data-exclude-search': 'true' },
  }),
  prompt: {
    message: 'Can I count your visit? Anonymous, cookieless, self-hosted analytics. No is a fine answer.',
    accept: 'Count me',
    decline: 'No thanks',
  },
});
```

```astro
---
// src/layouts/Layout.astro
import ConsentGate from '@vdaluz/astro-opt-in-analytics/ConsentGate.astro';
import ConsentPrompt from '@vdaluz/astro-opt-in-analytics/ConsentPrompt.astro';
import { analytics } from '../config/analytics';
---
<!-- Gate before prompt, both once per page -->
<ConsentGate config={analytics} />
<ConsentPrompt config={analytics} />
```

Footer link, no JS required:

```html
<button type="button" data-open-analytics-prompt>Analytics preferences</button>
```

## How it works

1. `ConsentGate` reads a versioned record from localStorage (`opt-in-analytics:consent`). Grant: the tracker `<script>` is injected. Anything else: nothing loads. `tracker` also accepts an array of adapters; one grant injects all of them (e.g. Umami plus a manually-installed Cloudflare Web Analytics beacon), and the prompt copy should disclose every tracker it covers.
2. `ConsentPrompt` shows only when there is no decision and no GPC signal. The answer is stored as `{ v, decision, at }`.
3. Bump `consentVersion` in your config when what you track changes; older stored decisions re-prompt.
4. A denial after a grant applies from the next navigation (the already-loaded script is not surgically removed; nothing new ever loads).

## Styling

The prompt reads CSS custom properties with sensible dark fallbacks: `--surface`, `--fg`, `--border`, `--accent`, `--on-accent`. Same token names as [@vdaluz/astro-blog](https://github.com/vdaluz/astro-blog); if your app already defines those, the prompt matches your theme with zero extra CSS.

## License

MIT
