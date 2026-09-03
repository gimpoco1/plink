import { translate } from "../../../i18n/translate";
import { useTheme } from "../../../theme/ThemeContext";

export function AppLoadingScreen() {
  const { theme } = useTheme();
  const iconSrc = theme === "light" ? "/favicon-light.png" : "/favicon.png";

  return (
    <div
      className="appLoading"
      role="status"
      aria-live="polite"
      aria-label={translate("copy.loading")}
    >
      <div className="appLoading__inner">
        <div className="appLoading__mark" aria-hidden="true">
          <img
            src={iconSrc}
            alt=""
            className="appLoading__img"
            width={512}
            height={512}
          />
        </div>
      </div>
    </div>
  );
}
