import { translate } from "../../i18n/translate";
import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AuthAccountPanel } from "./AuthAccountPanel";
import { useAuthDialogContext } from "./AuthDialogContext";
import { AuthPasswordRecoveryPanel } from "./AuthPasswordRecoveryPanel";
import { AuthSignedOutPanel } from "./AuthSignedOutPanel";

export function AuthDialogView() {
  const {
    dialogRef,
    hasSupabaseConfig,
    onOpenChange,
    error,
    notice,
    recoveryMode,
    session,
    setError,
    setNotice,
    setRecoveryMode,
    setTransferToast,
    transferToast,
  } = useAuthDialogContext();
  const dialogToast = error
    ? { message: error, tone: "error" as const }
    : notice
      ? { message: notice, tone: "success" as const }
      : transferToast;

  useEffect(() => {
    if (!error && !notice) return;
    const timeout = window.setTimeout(() => {
      setError(null);
      setNotice(null);
    }, 5200);
    return () => window.clearTimeout(timeout);
  }, [error, notice, setError, setNotice]);

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
            {session ? (
              <div className="dialog__eyebrow">
                {translate("copy.profileAndSettings")}
              </div>
            ) : null}
            <div className="dialog__title">
              {recoveryMode
                ? translate("copy.resetPassword")
                : translate("topbar.account")}
            </div>
          </div>
          <button
            className="iconbtn"
            type="button"
            onClick={() => {
              onOpenChange?.(false);
              dialogRef.current?.close();
            }}
            aria-label={translate("copy.close")}
          >
            ×
          </button>
        </div>
        {dialogToast ? (
          <div
            className={`authDialog__toast authDialog__toast--${dialogToast.tone}`}
            role={dialogToast.tone === "error" ? "alert" : "status"}
            aria-live={dialogToast.tone === "error" ? "assertive" : "polite"}
          >
            <span className="authDialog__toastIcon" aria-hidden="true">
              {dialogToast.tone === "error" ? (
                <AlertTriangle size={17} strokeWidth={2.5} />
              ) : dialogToast.tone === "success" ? (
                <CheckCircle2 size={17} strokeWidth={2.5} />
              ) : (
                <Info size={17} strokeWidth={2.5} />
              )}
            </span>
            <span>{dialogToast.message}</span>
          </div>
        ) : null}
        {!hasSupabaseConfig ? (
          <div className="authDialog__panel">
            <p className="authDialog__text">
              {translate("copy.configure")} <code>VITE_SUPABASE_URL</code>{" "}
              {translate("copy.and")} <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>{" "}
              {translate("copy.enableLoginAndCloudSync")}
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
