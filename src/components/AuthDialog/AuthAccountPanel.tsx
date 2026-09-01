import { translate } from "../../i18n/translate";
import { AlertTriangle, LogOut, Trash2, UserRound } from "lucide-react";
import { AuthAccountIdentity } from "./AuthAccountIdentity";
import { AuthAccountStorage } from "./AuthAccountStorage";
import { useAuthDialogContext } from "./AuthDialogContext";
import { AuthPlanSection } from "./AuthPlanSection";
import { AuthTransferSection } from "./AuthTransferSection";
import { AuthAppSettings } from "./AuthAppSettings";
import { AppStoreBanner } from "../AppStoreBanner/AppStoreBanner";

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
        <div className="authDialog__sectionHeading">
          <span className="authDialog__sectionHeadingIcon" aria-hidden="true">
            <UserRound size={17} strokeWidth={2.4} />
          </span>
          <span>{translate("copy.profileAndAccount")}</span>
        </div>
        <AuthAccountIdentity />
        <AuthAccountStorage />
        <AuthPlanSection />
      </div>
      <AuthAppSettings />
      <AppStoreBanner className="appStoreBanner--dark" />
      <AuthTransferSection />
      <button
        className="btn btn--wide btn--dangerSolid authDialog__signOutBtn"
        type="button"
        onClick={signOut}
        disabled={busy}
      >
        <LogOut size={17} strokeWidth={2.3} aria-hidden="true" />
        <span>
          {busy ? translate("copy.signingOut") : translate("copy.signOut")}
        </span>
      </button>
      {confirmingAccountDeletion ? (
        <section className="authDialog__deleteAccount" role="alert">
          <div className="authDialog__deleteAccountCopy">
            <AlertTriangle size={18} strokeWidth={2.4} aria-hidden="true" />
            <div>
              <strong>{translate("copy.permanentlyDeleteThisAccount")}</strong>
              <p>
                {translate(
                  "copy.cloudSessionsPlayersTeamsAndAccountAccessWillBeRemovedWebSubscriptions",
                )}
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
              {translate("copy.keepAccount")}
            </button>
            <button
              className="btn btn--dangerSolid btn--wide"
              type="button"
              disabled={busy}
              onClick={() => void deleteAccount()}
            >
              {busy
                ? translate("copy.deleting")
                : translate("copy.deletePermanently")}
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
          <span>{translate("copy.deleteAccount")}</span>
        </button>
      )}
      <div
        className="authDialog__links"
        aria-label={translate("copy.accountLinks")}
      >
        <a href="/guides/index.html">{translate("copy.guides")}</a>
        <span aria-hidden="true">·</span>
        <a href="/privacy.html">{translate("copy.privacy")}</a>
        <span aria-hidden="true">·</span>
        <a href="/support.html">{translate("copy.support")}</a>
      </div>
    </div>
  );
}
