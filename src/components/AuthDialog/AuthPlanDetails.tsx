import { translate } from "../../i18n/translate";
import { Check, Coffee, Croissant } from "lucide-react";
import { useAuthDialogContext } from "./AuthDialogContext";
import { SessionPassOffer } from "./SessionPassOffer";

export function AuthPlanDetails() {
  const {
    billingPeriodOptionRefs,
    busy,
    appleProductsByPeriod,
    appleProductsError,
    appleProductsLoading,
    handleBillingPeriodRadioKeyDown,
    hasStripeBillingProfile,
    isNativeIOS,
    isPro,
    manageSubscription,
    reloadAppleProducts,
    restoreSubscription,
    selectedBillingPeriod,
    setSelectedBillingPeriod,
    source,
    startUpgradeFlow,
    subscriptionProvider,
  } = useAuthDialogContext();
  const monthlyPrice = isNativeIOS
    ? appleProductsByPeriod.monthly?.displayPrice
    : "2.99 EUR";
  const yearlyPrice = isNativeIOS
    ? appleProductsByPeriod.yearly?.displayPrice
    : "17.99 EUR";
  const selectedAppleProduct = appleProductsByPeriod[selectedBillingPeriod];
  const purchaseUnavailable =
    isNativeIOS &&
    (appleProductsLoading || (!selectedAppleProduct && !appleProductsError));
  return (
    <div id="auth-plan-details" className="authDialog__planBody">
      {!isPro ? (
        <div className="authDialog__planHero authDialog__planHero--copyOnly">
          <div className="authDialog__planHeroCopy">
            <strong>{translate("copy.needMoreThanTheBasics")}</strong>
            <span>{translate("copy.youReMissingOutOn")}</span>
          </div>
        </div>
      ) : null}
      <div className="authDialog__planBenefits">
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>{translate("copy.unlimitedSavedSessions")}</span>
        </div>
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>{translate("copy.teamsSupportForGroupedPlayers")}</span>
        </div>
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>{translate("copy.advancedPlayerStatsAndReporting")}</span>
        </div>
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>{translate("copy.supportOurWork")}</span>
        </div>
      </div>

      {!isPro ? (
        <>
          <div
            className="authDialog__planOptions"
            role="radiogroup"
            aria-label={translate("copy.chooseBillingPeriod")}
          >
            <button
              ref={(node) => {
                billingPeriodOptionRefs.current[0] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selectedBillingPeriod === "monthly"}
              tabIndex={selectedBillingPeriod === "monthly" ? 0 : -1}
              className={`authDialog__planOption${
                selectedBillingPeriod === "monthly"
                  ? " authDialog__planOption--active"
                  : ""
              }`}
              onClick={() => setSelectedBillingPeriod("monthly")}
              onKeyDown={(event) => handleBillingPeriodRadioKeyDown(event, 0)}
            >
              <div className="authDialog__planOptionTop">
                <strong>{translate("copy.monthly")}</strong>
                <span>
                  {monthlyPrice ?? translate("copy.loadingPrice")}
                  {monthlyPrice ? translate("copy.month") : ""}
                </span>
              </div>
              <small className="authDialog__planEquivalent">
                <span className="authDialog__planEquivalentLabel">
                  {translate("copy.equivalentTo")}
                </span>
                <span className="authDialog__planEquivalentValue">
                  <Coffee size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>+</span>
                  <Croissant size={14} strokeWidth={2.2} aria-hidden="true" />
                </span>
              </small>
            </button>
            <button
              ref={(node) => {
                billingPeriodOptionRefs.current[1] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selectedBillingPeriod === "yearly"}
              tabIndex={selectedBillingPeriod === "yearly" ? 0 : -1}
              className={`authDialog__planOption${
                selectedBillingPeriod === "yearly"
                  ? " authDialog__planOption--active"
                  : ""
              }`}
              onClick={() => setSelectedBillingPeriod("yearly")}
              onKeyDown={(event) => handleBillingPeriodRadioKeyDown(event, 1)}
            >
              <div className="authDialog__planOptionTop">
                <strong>{translate("copy.yearly")}</strong>
                <span>
                  {yearlyPrice ?? translate("copy.loadingPrice")}
                  {yearlyPrice ? translate("copy.year") : ""}
                </span>
              </div>
              <small className="authDialog__planEquivalent">
                <span className="authDialog__planEquivalentLabel">
                  {translate("copy.equivalentTo")}
                </span>
                <span className="authDialog__planEquivalentValue">
                  <Coffee size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>{translate("copy.month2")}</span>
                </span>
              </small>
            </button>
          </div>
          <div className="authDialog__planActions">
            <button
              className="btn btn--primary btn--wide"
              type="button"
              disabled={busy || purchaseUnavailable}
              onClick={
                appleProductsError ? reloadAppleProducts : startUpgradeFlow
              }
            >
              {busy
                ? translate("copy.working")
                : appleProductsError
                  ? translate("copy.tryAppStoreAgain")
                  : purchaseUnavailable
                    ? translate("copy.connectingToAppStore")
                    : selectedBillingPeriod === "monthly"
                      ? translate("copy.subscribeMonthly")
                      : translate("copy.subscribeYearly")}
            </button>
            {isNativeIOS ? (
              <button
                className="btn btn--ghost btn--wide"
                type="button"
                disabled={busy}
                onClick={restoreSubscription}
              >
                {busy ? translate("copy.working") : translate("copy.restorePurchases")}
              </button>
            ) : hasStripeBillingProfile ? (
              <button
                className="btn btn--ghost btn--wide"
                type="button"
                disabled={busy}
                onClick={restoreSubscription}
              >
                {translate("copy.manageBilling")}
              </button>
            ) : null}
          </div>
          {isNativeIOS && appleProductsError ? (
            <p className="authDialog__planLegal" role="alert">
              {appleProductsError}
            </p>
          ) : null}
          {isNativeIOS ? (
            <p className="authDialog__planLegal">
              {translate("copy.paymentIsChargedToYourAppleAccountTheSubscriptionRenewsAutomaticallyUnless")}{" "}
              <a href="/terms.html">{translate("copy.terms")}</a> ·{" "}
              <a href="/privacy.html">{translate("copy.privacy")}</a>
            </p>
          ) : null}
          <SessionPassOffer />
        </>
      ) : (
        <>
          <div className="authDialog__planSupport">
            {isNativeIOS && subscriptionProvider === "stripe"
              ? translate("copy.yourPlinkProPlanIsBilledThroughTheWeb")
              : translate("copy.thanksForSupportingPlink")}
          </div>
          {source === "subscription" ? (
            <div className="authDialog__planActions">
              <button
                className="btn btn--ghost btn--wide"
                type="button"
                disabled={busy}
                onClick={manageSubscription}
              >
                {busy
                  ? translate("copy.working")
                  : isNativeIOS && subscriptionProvider === "stripe"
                    ? translate("copy.manageOnWeb")
                    : translate("copy.manageSubscription")}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
