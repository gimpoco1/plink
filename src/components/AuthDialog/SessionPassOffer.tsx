import { translate } from "../../i18n/translate";
import { BarChart3, Check, History, LockKeyhole, Mail } from "lucide-react";
import { useAuthDialogContext } from "./AuthDialogContext";

export function SessionPassOffer() {
  const {
    appleSessionPassError,
    appleSessionPassLoading,
    appleSessionPassProduct,
    busy,
    hasSessionPass,
    isNativeIOS,
    reloadAppleProducts,
    startSessionPassPurchase,
  } = useAuthDialogContext();
  const price = isNativeIOS
    ? appleSessionPassProduct?.displayPrice
    : "4.99 EUR";
  const unavailable =
    isNativeIOS &&
    (appleSessionPassLoading ||
      (!appleSessionPassProduct && !appleSessionPassError));

  return (
    <>
      <div className="authDialog__sessionPassDivider" aria-hidden="true">
        <span>{translate("copy.orChooseSessionsOnly")}</span>
      </div>
      <section className="authDialog__sessionPass">
        <div className="authDialog__sessionPassHeading">
          <div>
            <span className="authDialog__sessionPassEyebrow">
              {translate("copy.oneTimeSessionsOnly")}
            </span>
            <strong>{translate("copy.sessionPass")}</strong>
          </div>
        </div>

        <p className="authDialog__sessionPassValue">
          {translate("copy.keepMoreGameHistorySoPlayerStatsAreBasedOnMoreOf")}
        </p>

        <div className="authDialog__sessionPassBenefits">
          <span>
            <History size={16} strokeWidth={2.3} aria-hidden="true" />
            {translate("copy.storeUpTo100OwnedSessions")}
          </span>
          <span>
            <BarChart3 size={16} strokeWidth={2.3} aria-hidden="true" />
            {translate("copy.moreCompleteStatsHistory")}
          </span>
        </div>

        <div className="authDialog__sessionPassLimitations">
          <LockKeyhole size={18} strokeWidth={2.3} aria-hidden="true" />
          <div>
            <strong>{translate("copy.doesNotUnlockPro")}</strong>
            <span>
              {translate("copy.teamsAdvancedStatsAndOtherProFeaturesStayLocked")}
            </span>
          </div>
        </div>

        {hasSessionPass ? (
          <div className="authDialog__sessionPassActiveGroup">
            <div className="authDialog__sessionPassActive">
              <Check size={17} strokeWidth={2.6} aria-hidden="true" />
              {translate("copy.sessionPassActiveAccountRemainsFree")}
            </div>
            <a
              className="authDialog__sessionPassSupport"
              href="mailto:support@plinkscore.com?subject=More%20session%20capacity"
            >
              <Mail size={17} strokeWidth={2.3} aria-hidden="true" />
              <span>
                {translate("copy.needMoreSessions")}
                <strong>{translate("copy.contactSupport")}</strong>
              </span>
            </a>
          </div>
        ) : (
          <button
            className="btn btn--ghost btn--wide authDialog__sessionPassButton"
            type="button"
            disabled={busy || unavailable}
            onClick={
              appleSessionPassError
                ? reloadAppleProducts
                : startSessionPassPurchase
            }
          >
            {busy
              ? translate("copy.working")
              : appleSessionPassError
                ? translate("copy.tryAppStoreAgain")
                : appleSessionPassLoading
                  ? translate("copy.connectingToAppStore")
                  : translate("dynamic.buySessionPass", [price ? ` · ${price}` : ""])}
          </button>
        )}

        {isNativeIOS && appleSessionPassError && !hasSessionPass ? (
          <p className="authDialog__planLegal" role="alert">
            {appleSessionPassError}
          </p>
        ) : null}
      </section>
    </>
  );
}
