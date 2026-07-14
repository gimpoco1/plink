import { LogOut } from "lucide-react";
import { AuthAccountIdentity } from "./AuthAccountIdentity";
import { AuthAccountStorage } from "./AuthAccountStorage";
import { useAuthDialogContext } from "./AuthDialogContext";
import { AuthPlanSection } from "./AuthPlanSection";
import { AuthTransferSection } from "./AuthTransferSection";

export function AuthAccountPanel() {
  const { busy, error, notice, signOut } = useAuthDialogContext();
  return (
    <div className="authDialog__panel">
      <div className="authDialog__accountOverview">
        <AuthAccountIdentity />
        <AuthAccountStorage />
        <AuthPlanSection />
      </div>
      <AuthTransferSection />
      {notice ? <div className="authDialog__notice">{notice}</div> : null}
      {error ? <div className="authDialog__error">{error}</div> : null}
      <button
        className="btn btn--wide btn--dangerSolid authDialog__signOutBtn"
        type="button"
        onClick={signOut}
        disabled={busy}
      >
        <LogOut size={17} strokeWidth={2.3} aria-hidden="true" />
        <span>{busy ? "Signing out..." : "Sign out"}</span>
      </button>
      <div className="authDialog__links" aria-label="Account links">
        <a href="/privacy.html">Privacy</a>
        <span aria-hidden="true">·</span>
        <a href="/support.html">Support</a>
      </div>
    </div>
  );
}
