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
      ? `${sessionCount} session${sessionCount === 1 ? "" : "s"}`
      : "",
    profileCount > 0
      ? `${profileCount} player${profileCount === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean);
  const isPlural = sessionCount + profileCount !== 1;
  const message =
    parts.length === 2
      ? `${parts[0]} and ${parts[1]} are saved on this device but are not in your account yet. Add them now?`
      : `${parts[0] ?? parts[1]} ${isPlural ? "are" : "is"} saved on this device but ${isPlural ? "are" : "is"} not in your account yet. Add ${isPlural ? "them" : "it"} now?`;
  const eyebrow =
    sessionCount > 0 && profileCount > 0
      ? "Local sessions and players found"
      : profileCount > 0
        ? "Local players found"
        : "Local sessions found";

  return (
    <div className={`localSessionsHint${className ? ` ${className}` : ""}`}>
      <button
        className="localSessionsHint__dismiss"
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss local sessions notice"
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
        Let's add
      </button>
    </div>
  );
}
