import { translate } from "../../i18n/translate";
import { Plus, X } from "lucide-react";
import "./LocalSessionsHint.css";

type LocalSessionsHintProps = {
  sessionCount: number;
  profileCount: number;
  onDismiss: () => void;
  onAdd: () => void;
  className?: string;
};

export function LocalSessionsHint({
  sessionCount,
  profileCount,
  onDismiss,
  onAdd,
  className = "",
}: LocalSessionsHintProps) {
  const parts = [
    sessionCount > 0
      ? translate("dynamic.session", [sessionCount])
      : "",
    profileCount > 0
      ? translate("dynamic.player", [profileCount])
      : "",
  ].filter(Boolean);
  const totalCount = sessionCount + profileCount;
  const message =
    parts.length === 2
      ? translate("dynamic.andAreSavedOnThisDeviceButAreNotInYourAccount", [parts[0], parts[1]])
      : translate("dynamic.savedOnThisDeviceButNotInYourAccountYetAddNow", [
          totalCount,
          parts[0] ?? parts[1],
        ]);
  const eyebrow =
    sessionCount > 0 && profileCount > 0
      ? translate("copy.localSessionsAndPlayersFound")
      : profileCount > 0
        ? translate("copy.localPlayersFound")
        : translate("copy.localSessionsFound");

  return (
    <div className={`localSessionsHint${className ? ` ${className}` : ""}`}>
      <button
        className="localSessionsHint__dismiss"
        type="button"
        onClick={onDismiss}
        aria-label={translate("copy.dismissLocalSessionsNotice")}
      >
        <X size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <div className="localSessionsHint__content">
        <div className="localSessionsHint__eyebrow">
          <span>{eyebrow}</span>
        </div>
        <p>{message}</p>
      </div>
      <button
        className="btn btn--ghost btn--sm localSessionsHint__cta"
        type="button"
        onClick={onAdd}
      >
        <Plus size={17} strokeWidth={2.3} aria-hidden="true" />
        {translate("copy.letSAdd")}
      </button>
    </div>
  );
}
