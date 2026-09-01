import { Settings2 } from "lucide-react";
import { translate } from "../../i18n/translate";
import { LanguageSelector } from "../LanguageSelector/LanguageSelector";
import { AuthSharingPreferences } from "./AuthSharingPreferences";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthAppSettings() {
  const { session } = useAuthDialogContext();

  return (
    <section
      className="authDialog__settingsCard"
      aria-labelledby="auth-app-settings-title"
    >
      <div className="authDialog__sectionHeading">
        <span className="authDialog__sectionHeadingIcon" aria-hidden="true">
          <Settings2 size={17} strokeWidth={2.4} />
        </span>
        <span id="auth-app-settings-title">
          {translate("copy.appSettings")}
        </span>
      </div>
      <div className="authDialog__settingsRows">
        <LanguageSelector />
        {session ? <AuthSharingPreferences /> : null}
      </div>
    </section>
  );
}
