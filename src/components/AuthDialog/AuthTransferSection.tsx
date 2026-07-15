import { ChevronDown } from "lucide-react";
import { AuthTransferBody } from "./AuthTransferBody";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthTransferSection() {
  const { setShowTransferTools, showTransferTools } = useAuthDialogContext();
  return (
    <div className="authDialog__transfer">
      <button
        className="authDialog__transferToggle"
        type="button"
        onClick={() => setShowTransferTools((value) => !value)}
        aria-expanded={showTransferTools}
        aria-controls="auth-data-tools"
      >
        <span className="authDialog__transferHead">
          <span className="authDialog__label">Data transfer</span>
          <span className="authDialog__text">
            Add device sessions to this account, restore a backup, or download a
            copy.
          </span>
        </span>
        <span
          className={`authDialog__transferChevron${showTransferTools ? " authDialog__transferChevron--open" : ""}`}
          aria-hidden="true"
        >
          <ChevronDown size={18} strokeWidth={2.2} />
        </span>
      </button>
      {showTransferTools ? <AuthTransferBody /> : null}
    </div>
  );
}
