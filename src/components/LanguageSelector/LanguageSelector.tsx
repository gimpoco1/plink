import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import {
  languageLabels,
  languages,
  LANGUAGE_DIALOG_REOPEN_KEY,
  useI18n,
} from "../../i18n/I18nContext";

const languageFlags = {
  en: "🇬🇧",
  es: "🇪🇸",
  it: "🇮🇹",
} as const;

type LanguageSelectorProps = {
  variant?: "settings" | "topbar";
};

export function LanguageSelector({
  variant = "settings",
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <section className={`languageSelector languageSelector--${variant}`}>
      {variant === "settings" ? (
        <>
          <span className="languageSelector__icon" aria-hidden="true">
            <Languages size={17} strokeWidth={2.4} />
          </span>
          <div className="languageSelector__copy">
            <span className="languageSelector__title">
              {t("language.label")}
            </span>
          </div>
        </>
      ) : null}
      <div className="languageSelector__dropdown" ref={dropdownRef}>
        <button
          className="languageSelector__trigger"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${t("language.label")}: ${languageLabels[language]}`}
          onClick={() => setOpen((value) => !value)}
        >
          {variant === "topbar" ? (
            <span className="languageSelector__initials" aria-hidden="true">
              {language.toUpperCase()}
            </span>
          ) : (
            <>
              <span className="languageSelector__flag" aria-hidden="true">
                {languageFlags[language]}
              </span>
              <span className="languageSelector__value">
                {languageLabels[language]}
              </span>
            </>
          )}
          <ChevronDown
            className={`languageSelector__chevron${
              open ? " languageSelector__chevron--open" : ""
            }`}
            size={16}
            strokeWidth={2.4}
            aria-hidden="true"
          />
        </button>
        {open ? (
          <div
            className="languageSelector__menu"
            role="listbox"
            aria-label={t("language.label")}
          >
            {languages.map((option) => (
              <button
                key={option}
                className={`languageSelector__option${
                  language === option ? " languageSelector__option--active" : ""
                }`}
                type="button"
                role="option"
                aria-selected={language === option}
                onClick={() => {
                  if (option === language) {
                    setOpen(false);
                    return;
                  }
                  if (variant === "settings") {
                    try {
                      window.sessionStorage.setItem(
                        LANGUAGE_DIALOG_REOPEN_KEY,
                        "true",
                      );
                    } catch {
                      // Reload still applies the persisted language preference.
                    }
                  }
                  setLanguage(option);
                  window.location.reload();
                }}
              >
                <span className="languageSelector__flag" aria-hidden="true">
                  {languageFlags[option]}
                </span>
                <span>{languageLabels[option]}</span>
                {language === option ? (
                  <Check size={15} strokeWidth={2.7} aria-hidden="true" />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
