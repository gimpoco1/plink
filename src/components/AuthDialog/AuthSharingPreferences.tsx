import { Link } from "lucide-react";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthSharingPreferences() {
  const {
    allowPreviousPlayersToInvite,
    sharingPreferenceLoading,
    updateSharingPreference,
  } = useAuthDialogContext();

  return (
    <section className="authDialog__sharingPreference">
      <span className="authDialog__sharingPreferenceIcon" aria-hidden="true">
        <Link size={17} strokeWidth={2.4} />
      </span>
      <div className="authDialog__sharingPreferenceCopy">
        <span className="authDialog__sharingPreferenceTitle">
          Allow automatic game invites
        </span>
        <span className="authDialog__sharingPreferenceDescription">
          People you’ve played with can add you to a new game without a code.
        </span>
      </div>
      <input
        className="authDialog__sharingPreferenceCheckbox"
        type="checkbox"
        role="switch"
        checked={allowPreviousPlayersToInvite}
        disabled={sharingPreferenceLoading}
        onChange={(event) =>
          void updateSharingPreference(event.target.checked)
        }
        aria-label="Allow automatic game invites from previous players"
      />
    </section>
  );
}
