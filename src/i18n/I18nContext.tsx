import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentLanguage,
  languages,
  LANGUAGE_STORAGE_KEY,
  translateForLanguage,
  type Language,
  type TranslationKey,
  type TranslationValues,
} from "./translate";

export { languages, type Language, type TranslationKey };

export const languageLabels: Record<Language, string> = {
  en: "English",
  es: "Español",
  it: "Italiano",
};

export const LANGUAGE_DIALOG_REOPEN_KEY = "plink:reopen-language-dialog";

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => boolean;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setActiveLanguage] = useState<Language>(getCurrentLanguage);

  const setLanguage = useCallback((nextLanguage: Language) => {
    let persisted = false;

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      persisted = true;
    } catch {
      // The selected language remains active for this session.
    }

    setActiveLanguage(nextLanguage);
    return persisted;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (key, values) => translateForLanguage(language, key, values),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
