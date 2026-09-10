export type Localized = string | ({ default: string } & Record<string, string>);

export function resolveLocalized(text: Localized, locale?: string): string {
  if (typeof text === 'string') return text;
  if (!locale) return text.default;
  const primarySubtag = locale.split('-')[0].toLowerCase();
  return text[locale] || text[primarySubtag] || text.default;
}
