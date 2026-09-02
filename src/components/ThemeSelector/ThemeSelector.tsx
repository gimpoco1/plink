import { Moon, Sun } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { useTheme } from "../../theme/ThemeContext";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const lightMode = theme === "light";

  return (
    <section className="themeSelector">
      <span className="themeSelector__icon" aria-hidden="true">
        {lightMode ? <Sun size={17} strokeWidth={2.4} /> : <Moon size={17} strokeWidth={2.4} />}
      </span>
      <div className="themeSelector__copy">
        <span className="themeSelector__title">{t("theme.label")}</span>
        <span className="themeSelector__description">{t("theme.description")}</span>
      </div>
      <input
        className="themeSelector__toggle"
        type="checkbox"
        role="switch"
        checked={lightMode}
        onChange={(event) => setTheme(event.target.checked ? "light" : "dark")}
        aria-label={t("theme.label")}
      />
    </section>
  );
}
