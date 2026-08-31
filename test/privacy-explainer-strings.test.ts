import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PRIVACY_EXPLAINER_STRINGS,
  resolvePrivacyExplainerStrings,
} from '../src/lib/privacy-explainer-strings.ts';

test('resolvePrivacyExplainerStrings returns the defaults unmodified with no overrides', () => {
  assert.deepEqual(resolvePrivacyExplainerStrings(), DEFAULT_PRIVACY_EXPLAINER_STRINGS);
});

test('resolvePrivacyExplainerStrings overrides only the given key, keeping the rest at default', () => {
  const custom = { default: 'Custom heading' };
  const resolved = resolvePrivacyExplainerStrings({ whatsCollectedHeading: custom });
  assert.deepEqual(resolved.whatsCollectedHeading, custom);
  assert.deepEqual(resolved.bullets, DEFAULT_PRIVACY_EXPLAINER_STRINGS.bullets);
  assert.deepEqual(resolved.toolsHeading, DEFAULT_PRIVACY_EXPLAINER_STRINGS.toolsHeading);
});

test('default whatsCollectedBody discloses browser language and screen resolution', () => {
  const body = DEFAULT_PRIVACY_EXPLAINER_STRINGS.whatsCollectedBody;
  const text = typeof body === 'string' ? body : body.default;
  assert.ok(text.includes('language'));
  assert.ok(text.includes('screen resolution'));
});
