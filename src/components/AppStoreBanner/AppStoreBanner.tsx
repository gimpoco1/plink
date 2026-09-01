import { FaApple } from "react-icons/fa";
import { APP_STORE_URL } from "../../constants";
import { translate } from "../../i18n/translate";
import { isNativeApp } from "../../lib/nativePlatform";
import "./AppStoreBanner.css";

export function AppStoreBanner({ className }: { className?: string }) {
  if (isNativeApp()) {
    return null;
  }

  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className={`appStoreBanner${className ? ` ${className}` : ""}`}
      aria-label={translate("copy.downloadOnAppStore")}
    >
      <FaApple className="appStoreBanner__apple" aria-hidden="true" />
      <div className="appStoreBanner__content">
        <div className="appStoreBanner__label">
          {translate("copy.availableOnThe")}
        </div>
        <div className="appStoreBanner__store">App Store</div>
      </div>
    </a>
  );
}
