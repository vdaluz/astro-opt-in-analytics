export type Localized = string | ({ default: string } & Record<string, string>);

export function resolveLocalized(text: Localized, locale?: string): string {
  if (typeof text === 'string') return text;
  return (locale && text[locale]) || text.default;
}
