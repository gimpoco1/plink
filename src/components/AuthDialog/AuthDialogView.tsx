import { translate } from "../../i18n/translate";
import { useEffect, useRef, useState } from "react";
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
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollThumb, setScrollThumb] = useState<{
    height: number;
    top: number;
  } | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const scrollArea = event.currentTarget;
    const maxScrollTop = scrollArea.scrollHeight - scrollArea.clientHeight;
    if (maxScrollTop > 0) {
      const height = Math.max(
        32,
        (scrollArea.clientHeight * scrollArea.clientHeight) /
          scrollArea.scrollHeight,
      );
      setScrollThumb({
        height,
        top:
          4 +
          (scrollArea.scrollTop / maxScrollTop) *
            Math.max(0, scrollArea.clientHeight - height - 8),
      });
    }
    setIsScrolling(true);
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      scrollTimeoutRef.current = null;
      setIsScrolling(false);
    }, 700);
  }

  return (
    <dialog
      className={`dialog authDialog${isScrolling ? " authDialog--scrolling" : ""}`}
      ref={dialogRef}
      onClose={() => {
        onOpenChange?.(false);
        setNotice(null);
        setTransferToast(null);
        setError(null);
        setRecoveryMode(false);
      }}
    >
      <div className="authDialog__scrollArea" onScroll={handleScroll}>
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
      </div>
      {scrollThumb ? (
        <span
          className="authDialog__scrollThumb"
          aria-hidden="true"
          style={{
            height: scrollThumb.height,
            transform: `translateY(${scrollThumb.top}px)`,
          }}
        />
      ) : null}
    </dialog>
  );
}
