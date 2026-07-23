import { AlertTriangle, LogOut, Trash2 } from "lucide-react";
import { AuthAccountIdentity } from "./AuthAccountIdentity";
import { AuthAccountStorage } from "./AuthAccountStorage";
import { AuthSharingPreferences } from "./AuthSharingPreferences";
import { useAuthDialogContext } from "./AuthDialogContext";
import { AuthPlanSection } from "./AuthPlanSection";
import { AuthTransferSection } from "./AuthTransferSection";

export function AuthAccountPanel() {
  const {
    busy,
    confirmingAccountDeletion,
    deleteAccount,
    setConfirmingAccountDeletion,
    signOut,
  } = useAuthDialogContext();
  return (
    <div className="authDialog__panel">
      <div className="authDialog__accountOverview">
        <AuthAccountIdentity />
        <AuthSharingPreferences />
        <AuthAccountStorage />
        <AuthPlanSection />
      </div>
      <AuthTransferSection />
      <button
        className="btn btn--wide btn--dangerSolid authDialog__signOutBtn"
        type="button"
        onClick={signOut}
        disabled={busy}
      >
        <LogOut size={17} strokeWidth={2.3} aria-hidden="true" />
        <span>{busy ? "Signing out..." : "Sign out"}</span>
      </button>
      {confirmingAccountDeletion ? (
        <section className="authDialog__deleteAccount" role="alert">
          <div className="authDialog__deleteAccountCopy">
            <AlertTriangle size={18} strokeWidth={2.4} aria-hidden="true" />
            <div>
              <strong>Permanently delete this account?</strong>
              <p>
                Cloud sessions, players, teams, and account access will be
                removed. Web subscriptions will be cancelled. Apple
                subscriptions must be cancelled separately in App Store
                settings. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="authDialog__deleteAccountActions">
            <button
              className="btn btn--ghost btn--wide"
              type="button"
              disabled={busy}
              onClick={() => setConfirmingAccountDeletion(false)}
            >
              Keep account
            </button>
            <button
              className="btn btn--dangerSolid btn--wide"
              type="button"
              disabled={busy}
              onClick={() => void deleteAccount()}
            >
              {busy ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </section>
      ) : (
        <button
          className="btn btn--ghost btn--wide authDialog__deleteAccountBtn"
          type="button"
          disabled={busy}
          onClick={() => setConfirmingAccountDeletion(true)}
        >
          <Trash2 size={17} strokeWidth={2.3} aria-hidden="true" />
          <span>Delete account</span>
        </button>
      )}
      <div className="authDialog__links" aria-label="Account links">
        <a href="/privacy.html">Privacy</a>
        <span aria-hidden="true">·</span>
        <a href="/support.html">Support</a>
      </div>
    </div>
  );
}
