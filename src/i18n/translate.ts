import messagesJson from "./locales.json";

export const languages = ["en", "es", "it"] as const;
export type Language = (typeof languages)[number];
export type TranslationKey = keyof (typeof messagesJson)["en"];
export type TranslationValues = readonly unknown[];

export const LANGUAGE_STORAGE_KEY = "plink:language:v1";

type Message = string | { one: string; other: string };
const messages = messagesJson as Record<
  Language,
  Record<TranslationKey, Message>
>;

function getSupportedLanguage(locale: string | null): Language | null {
  if (!locale) return null;

  const baseLanguage = locale.trim().toLowerCase().split(/[-_]/)[0];
  return languages.includes(baseLanguage as Language)
    ? (baseLanguage as Language)
    : null;
}

export function getCurrentLanguage(): Language {
  if (typeof window === "undefined") return "en";

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const supportedStoredLanguage = getSupportedLanguage(storedLanguage);
    if (supportedStoredLanguage) return supportedStoredLanguage;
  } catch {
    // Fall back to the device language when local storage is unavailable.
  }

  const preferredLanguages = [
    ...(window.navigator.languages ?? []),
    window.navigator.language,
  ];

  for (const locale of preferredLanguages) {
    const supportedLanguage = getSupportedLanguage(locale);
    if (supportedLanguage) return supportedLanguage;
  }

  return "en";
}

export function translateForLanguage(
  language: Language,
  key: TranslationKey,
  values: TranslationValues = [],
): string {
  const message = messages[language][key] ?? messages.en[key];
  const template =
    typeof message === "string"
      ? message
      : Number(values[0]) === 1
        ? message.one
        : message.other;

  return template.replace(/\{(\d+)\}/g, (placeholder, index: string) => {
    const value = values[Number(index)];
    return value === undefined || value === null ? placeholder : String(value);
  });
}

export function translate(
  key: TranslationKey,
  values: TranslationValues = [],
): string {
  return translateForLanguage(getCurrentLanguage(), key, values);
}
