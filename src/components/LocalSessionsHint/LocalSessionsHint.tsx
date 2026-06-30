import { Plus, X } from "lucide-react";
import "./LocalSessionsHint.css";

type LocalSessionsHintProps = {
  count: number;
  onDismiss: () => void;
  onAdd: () => void;
  className?: string;
};

export function LocalSessionsHint({
  count,
  onDismiss,
  onAdd,
  className = "",
}: LocalSessionsHintProps) {
  const message =
    count === 1
      ? "1 session is saved on this device but is not in your account yet. Add it now?"
      : `${count} sessions are saved on this device but are not in your account yet. Add them now?`;

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
          <span>Local sessions found</span>
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
