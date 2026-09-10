import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocalized } from '../src/lib/i18n.ts';

test('resolveLocalized returns a plain string as-is', () => {
  assert.equal(resolveLocalized('Accept'), 'Accept');
});

test('resolveLocalized returns default when no locale is given', () => {
  assert.equal(resolveLocalized({ default: 'EN', pt: 'PT' }), 'EN');
});

test('resolveLocalized returns default for an unrecognized locale', () => {
  assert.equal(resolveLocalized({ default: 'EN', pt: 'PT' }, 'fr'), 'EN');
});

test('resolveLocalized matches an exact locale key', () => {
  assert.equal(resolveLocalized({ default: 'EN', es: 'ES' }, 'es'), 'ES');
});

test('resolveLocalized falls back to the primary subtag for a region-qualified locale', () => {
  assert.equal(resolveLocalized({ default: 'EN', pt: 'PT' }, 'pt-BR'), 'PT');
  assert.equal(resolveLocalized({ default: 'EN', es: 'ES' }, 'es-CR'), 'ES');
  assert.equal(resolveLocalized({ default: 'EN', zh: 'ZH' }, 'zh-Hant-TW'), 'ZH');
});

test('resolveLocalized prefers an exact region match over the primary subtag', () => {
  assert.equal(resolveLocalized({ default: 'EN', pt: 'PT', 'pt-BR': 'PT-BR' }, 'pt-BR'), 'PT-BR');
});

test('resolveLocalized falls back to default when neither the exact locale nor its subtag exist', () => {
  assert.equal(resolveLocalized({ default: 'EN', pt: 'PT' }, 'zh-Hant-TW'), 'EN');
});
