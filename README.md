# @vdaluz/astro-opt-in-analytics

[![npm version](https://img.shields.io/npm/v/@vdaluz/astro-opt-in-analytics.svg)](https://www.npmjs.com/package/@vdaluz/astro-opt-in-analytics)
[![CI](https://github.com/vdaluz/astro-opt-in-analytics/actions/workflows/ci.yml/badge.svg)](https://github.com/vdaluz/astro-opt-in-analytics/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@vdaluz/astro-opt-in-analytics.svg)](LICENSE)

Consent-first analytics for Astro. The tracker script does not exist on the page until the visitor says yes: no requests, no fingerprinting surface, nothing to block. An opt-in prompt asks once, the answer is remembered, and refusing is exactly as easy as accepting.

Built for [Umami](https://umami.is) first, with a small adapter interface for other trackers. Ships raw `.astro` and `.ts` - the consuming app's Astro/Vite compiles them (no prebuild step). Proven in production on vdaluz.com, imperfectsystems.com, and wq1k.com - see [Consumers](#consumers).

## Why opt-in

Most "privacy-respecting analytics" setups still track by default and put the burden of blocking on the visitor. This package flips the default: tracking is off until a real yes. That costs you data. That is the point.

- **Zero requests until consent.** Trackers activate only after a stored grant. Denied or unanswered means no request ever fires.
- **[Global Privacy Control](https://globalprivacycontrol.org/) is an answer.** `navigator.globalPrivacyControl === true` counts as a no. The prompt never shows; asking again would be its own dark pattern.
- **Anti-dark-pattern by construction.** Equal-weight buttons, decline first in DOM order, Esc or dismissal means deny, no overlay, no scroll lock. These are hard-coded, not configurable.
- **Changeable, both directions.** `openConsentPrompt()` (or any element with `data-open-analytics-prompt`) reopens the prompt, e.g. from a footer "Analytics preferences" link.

## Install

```
npm install @vdaluz/astro-opt-in-analytics
```

Peer dependency: `astro` >= 6.

## Use

```ts
// src/config/analytics.ts
import { defineAnalyticsConfig, umami } from '@vdaluz/astro-opt-in-analytics';

export const analytics = defineAnalyticsConfig({
  tracker: umami({
    src: 'https://umami.example.net/script.js',
    websiteId: '00000000-0000-0000-0000-000000000000',
    excludeSearch: true,
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

### Example

`ConsentPrompt` live on vdaluz.com, first visit, no stored decision:

![ConsentPrompt dialog on vdaluz.com](docs/consent-prompt-example.png)

## Privacy explainer page

`PrivacyExplainer.astro` renders the substantive sections of a `/privacy` page - what's collected, how consent gates it, and which tools are behind it - sourced directly from your `analytics` config so the page can't drift from what's actually injected. Wrap it in your own layout and hero copy:

```astro
---
// src/pages/privacy.astro
import Layout from '../layouts/Layout.astro';
import PrivacyExplainer from '@vdaluz/astro-opt-in-analytics/PrivacyExplainer.astro';
import { analytics } from '../config/analytics';
---
<Layout title="Privacy & Analytics">
  <h1>Privacy &amp; analytics</h1>
  <PrivacyExplainer config={analytics} locale={Astro.currentLocale} />
</Layout>
```

The "tools behind it" list only shows trackers that carry a `privacyInfo` field. Both bundled adapters set a sensible default - `umami()` points at [umami.is/privacy](https://umami.is/privacy), `cloudflareBeacon()` at [cloudflare.com/web-analytics](https://www.cloudflare.com/web-analytics/) - override `privacyInfo` per adapter call to customize the label or add a `description` clause about your specific deployment (e.g. "that I run myself, on my own infrastructure"). A tracker with no `privacyInfo` is simply omitted from the list.

## Cloudflare Web Analytics

`cloudflareBeacon({ token })` builds the manual (non-auto-injected) beacon script tag, gated by consent like any other adapter:

```ts
import { cloudflareBeacon } from '@vdaluz/astro-opt-in-analytics';

cloudflareBeacon({ token: '00000000000000000000000000000000' });
```

This requires switching off Cloudflare's edge auto-injection for the zone (dashboard: Web Analytics → Manage Site → enable "JS snippet installation") - otherwise the auto-injected beacon loads unconditionally alongside this one, bypassing consent.

## Custom events

`trackEvent(name, data?)` (from `./client`) reports a custom event directly to Umami's `/api/send`, gated on live consent the same way the pageview tracker is: it no-ops when consent is denied, undecided, GPC applies, or the page has no Umami tracker (e.g. Cloudflare Beacon only - it has no custom-event API, so `trackEvent` is Umami-only by design). Consent is re-checked at call time, not at page load.

### Affiliate click tracking

`bindAffiliateClickTracking()` is wired in automatically by `bootConsentGate()` - no extra setup needed. It's a delegated click listener for any `[data-affiliate-key]` anchor on the page, the contract [`@vdaluz/astro-affiliate`'s `<AffiliateLink>`](https://github.com/vdaluz/astro-affiliate#click-tracking) renders. On click it reports an `affiliate-click` event with `{ key, channel, program }` - `channel` defaults to `'default'` when the link didn't pass one, so Umami's per-channel breakdown is always populated. Middle-click (`auxclick`) is not counted; this sits inside the same consent-gated undercount the rest of the package already accepts.

Harmless on pages with no affiliate links - the listener still binds (cheap, one delegated handler) but never matches anything.

## How it works

1. `ConsentGate` reads a versioned record from localStorage (`opt-in-analytics:consent`). Grant: every configured tracker activates - Umami by posting a pageview straight to `/api/send` (see [Why Umami skips the official script](#why-umami-skips-the-official-script)), anything else (e.g. Cloudflare Beacon) by injecting its `<script>` tag. Anything else: nothing loads. `tracker` also accepts an array of adapters; one grant activates all of them, and the prompt copy should disclose every tracker it covers.
2. `ConsentPrompt` shows only when there is no decision and no GPC signal. The answer is stored as `{ v, decision, at }`.
3. Bump `consentVersion` in your config when what you track changes; older stored decisions re-prompt.
4. A denial after a grant applies from the next navigation (an already-active tracker is not torn down; nothing new ever activates).

### Why Umami skips the official script

Umami's own tracker script initializes by reading `document.currentScript` - the `<script>` element it's currently running from - to find its config attributes. That's `null` for a script this package injects dynamically after consent, so the official script silently never initializes: no error, no network request beyond the initial (harmless) script fetch. `umami()` sidesteps this by posting directly to Umami's documented [`/api/send`](https://docs.umami.is/docs/api/sending-stats) endpoint instead, reimplementing the parts of the official script this package needs (session-cache token, domain filtering, Do Not Track, search/hash stripping). `cloudflareBeacon()` has no such dependency and is unaffected - it still loads via an injected `<script>` tag.

## Styling

The prompt reads CSS custom properties with sensible dark fallbacks: `--surface`, `--fg`, `--border`, `--accent`, `--on-accent`. Same token contract as [@vdaluz/astro-blog](https://github.com/vdaluz/astro-blog): values are **R G B channel triplets** (e.g. `--surface: 26 26 26;`), consumed as `rgb(var(--name))`. If your app already defines those, the prompt matches your theme with zero extra CSS.

`PrivacyExplainer.astro` is different: it's styled entirely with Tailwind token utility classes (`text-fg`, `text-muted`, `text-accent`, `space-y-12`, and similar), not CSS custom properties. For it to render styled at all, your app must:

1. **Alias the token colors in `tailwind.config.mjs`** - see [`@vdaluz/astro-blog`'s README](https://github.com/vdaluz/astro-blog#four-things-every-consumer-must-do) for the exact color-alias block, since both packages share the same token names.
2. **Include this package in your Tailwind `content` glob**: `./node_modules/@vdaluz/astro-opt-in-analytics/**/*.astro` - without it, `PrivacyExplainer`'s utility classes are never generated and the page renders unstyled.

Without both, `PrivacyExplainer` still works functionally (it's sourced from your live config, so it can't drift from what's actually injected) but renders as unstyled text.

## Contributing

Issues welcome. PRs by discussion - open an issue first for anything beyond a typo or docs fix.

## Consumers

- [vdaluz.com](https://vdaluz.com)
- [imperfectsystems.com](https://imperfectsystems.com)
- [wq1k.com](https://wq1k.com)
- [freetoolbox.net](https://freetoolbox.net)
- [vicstradamus.com](https://vicstradamus.com) (Cloudflare Web Analytics only, via `cloudflareBeacon()`)

## License

MIT
