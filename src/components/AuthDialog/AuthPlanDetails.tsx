import { translate } from "../../i18n/translate";
import { useState } from "react";
import { Check, CheckCircle2, Coffee, Croissant, Tag } from "lucide-react";
import { useAuthDialogContext } from "./AuthDialogContext";
import { SessionPassOffer } from "./SessionPassOffer";

export function AuthPlanDetails() {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const {
    billingPeriodOptionRefs,
    busy,
    appleProductsByPeriod,
    appleProductsError,
    appleProductsLoading,
    appleReferralCode,
    appleReferralChecking,
    appleReferralError,
    appleReferralOffer,
    handleBillingPeriodRadioKeyDown,
    hasStripeBillingProfile,
    isNativeIOS,
    isPro,
    manageSubscription,
    reloadAppleProducts,
    restoreSubscription,
    selectedBillingPeriod,
    setSelectedBillingPeriod,
    setAppleReferralCode,
    source,
    startUpgradeFlow,
    subscriptionProvider,
    validateAppleReferralCode,
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
          {isNativeIOS ? (
            <div className="authDialog__promoDisclosure">
              <button
                type="button"
                className="authDialog__promoToggle"
                aria-expanded={showPromoCode}
                aria-controls="auth-promo-code-panel"
                onClick={() => setShowPromoCode((visible) => !visible)}
              >
                <Tag size={15} strokeWidth={2.2} aria-hidden="true" />
                <span>{translate("copy.doYouHaveAPromoCode")}</span>
              </button>
              {showPromoCode ? (
                <form
                  id="auth-promo-code-panel"
                  className="authDialog__promoPanel"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!appleReferralCode.trim() || busy || appleReferralChecking) {
                      return;
                    }
                    void validateAppleReferralCode();
                  }}
                >
                  <div className="authDialog__promoInputRow">
                    <div className="authDialog__promoInputWrap">
                      <input
                        type="text"
                        value={appleReferralCode}
                        aria-label={translate("copy.promoCode")}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={64}
                        placeholder={translate("copy.promoCode")}
                        disabled={busy || appleReferralChecking}
                        onChange={(event) =>
                          setAppleReferralCode(event.target.value.toUpperCase())
                        }
                      />
                      {appleReferralOffer ? (
                        <CheckCircle2
                          className="authDialog__promoValidIcon"
                          size={17}
                          strokeWidth={2.6}
                          aria-label={translate("copy.promoCodeIsValid")}
                        />
                      ) : null}
                    </div>
                    <button
                      type="submit"
                      className="authDialog__promoApply"
                      disabled={
                        busy ||
                        appleReferralChecking ||
                        !appleReferralCode.trim()
                      }
                    >
                      {appleReferralChecking
                        ? translate("copy.checking")
                        : translate("copy.apply")}
                    </button>
                  </div>
                  {appleReferralOffer ? (
                    <p className="authDialog__promoFeedback authDialog__promoFeedback--success">
                      <span>
                        {translate("dynamic.discountWillBeAppliedAtCheckout", [
                          appleReferralOffer.discountPercent,
                        ])}
                      </span>
                    </p>
                  ) : appleReferralError ? (
                    <p
                      className="authDialog__promoFeedback authDialog__promoFeedback--error"
                      role="alert"
                    >
                      {appleReferralError}
                    </p>
                  ) : null}
                </form>
              ) : null}
            </div>
          ) : (
            <p className="authDialog__webPromoNotice">
              <Tag size={14} strokeWidth={2.2} aria-hidden="true" />
              <span>{translate("copy.promoCodesCanBeEnteredAtCheckout")}</span>
            </p>
          )}
          <div className="authDialog__planActions">
            <button
              className="btn btn--primary btn--wide"
              type="button"
              disabled={busy || appleReferralChecking || purchaseUnavailable}
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
                {busy
                  ? translate("copy.working")
                  : translate("copy.restorePurchases")}
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
              {translate(
                "copy.paymentIsChargedToYourAppleAccountTheSubscriptionRenewsAutomaticallyUnless",
              )}{" "}
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
