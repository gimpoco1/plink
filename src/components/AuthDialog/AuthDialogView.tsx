import { AuthAccountPanel } from "./AuthAccountPanel";
import { useAuthDialogContext } from "./AuthDialogContext";
import { AuthPasswordRecoveryPanel } from "./AuthPasswordRecoveryPanel";
import { AuthSignedOutPanel } from "./AuthSignedOutPanel";

export function AuthDialogView() {
  const {
    dialogRef,
    hasSupabaseConfig,
    onOpenChange,
    recoveryMode,
    session,
    setError,
    setNotice,
    setRecoveryMode,
    setTransferToast,
    transferToast,
  } = useAuthDialogContext();
  return (
    <dialog
      className="dialog authDialog"
      ref={dialogRef}
      onClose={() => {
        onOpenChange?.(false);
        setNotice(null);
        setTransferToast(null);
        setError(null);
        setRecoveryMode(false);
      }}
    >
      <div className="dialog__form authDialog__form">
        <div className="dialog__head">
          <div className="authDialog__headCopy dialog__titleWrap">
            <div className="dialog__eyebrow">Profile and sync</div>
            <div className="dialog__title">
              {recoveryMode ? "Reset password" : "Account"}
            </div>
          </div>
          <button
            className="iconbtn"
            type="button"
            onClick={() => {
              onOpenChange?.(false);
              dialogRef.current?.close();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {transferToast && session && !recoveryMode ? (
          <div
            className={`authDialog__toast authDialog__toast--${transferToast.tone}`}
            role="status"
            aria-live="polite"
          >
            {transferToast.message}
          </div>
        ) : null}
        {!hasSupabaseConfig ? (
          <div className="authDialog__panel">
            <p className="authDialog__text">
              Configure <code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to enable login and
              cloud sync.
            </p>
          </div>
        ) : recoveryMode ? (
          <AuthPasswordRecoveryPanel />
        ) : session ? (
          <AuthAccountPanel />
        ) : (
          <AuthSignedOutPanel />
        )}
      </div>
    </dialog>
  );
}
