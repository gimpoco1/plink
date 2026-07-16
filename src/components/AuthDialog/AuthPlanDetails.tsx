import { Check, Coffee, Croissant } from "lucide-react";
import { useAuthDialogContext } from "./AuthDialogContext";

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
            <strong>Need more than the basics?</strong>
            <span>You're missing out on:</span>
          </div>
        </div>
      ) : null}
      <div className="authDialog__planBenefits">
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>Unlimited saved sessions</span>
        </div>
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>Ad-free experience</span>
        </div>
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>Teams support for grouped players</span>
        </div>
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>Advanced player stats and reporting</span>
        </div>
        <div className="authDialog__planBenefit">
          <span className="authDialog__planBenefitIcon" aria-hidden="true">
            <Check size={15} strokeWidth={2.6} />
          </span>
          <span>Support our work</span>
        </div>
      </div>

      {!isPro ? (
        <>
          <div
            className="authDialog__planOptions"
            role="radiogroup"
            aria-label="Choose billing period"
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
                <strong>Monthly</strong>
                <span>
                  {monthlyPrice ?? "Loading price…"}
                  {monthlyPrice ? " / month" : ""}
                </span>
              </div>
              <small className="authDialog__planEquivalent">
                <span className="authDialog__planEquivalentLabel">
                  Equivalent to:
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
                <strong>Yearly</strong>
                <span>
                  {yearlyPrice ?? "Loading price…"}
                  {yearlyPrice ? " / year" : ""}
                </span>
              </div>
              <small className="authDialog__planEquivalent">
                <span className="authDialog__planEquivalentLabel">
                  Equivalent to:
                </span>
                <span className="authDialog__planEquivalentValue">
                  <Coffee size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>/ month</span>
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
                ? "Working..."
                : appleProductsError
                  ? "Try App Store again"
                  : purchaseUnavailable
                    ? "Connecting to App Store…"
                    : selectedBillingPeriod === "monthly"
                      ? "Subscribe monthly"
                      : "Subscribe yearly"}
            </button>
            {isNativeIOS ? (
              <button
                className="btn btn--ghost btn--wide"
                type="button"
                disabled={busy}
                onClick={restoreSubscription}
              >
                {busy ? "Working..." : "Restore purchases"}
              </button>
            ) : hasStripeBillingProfile ? (
              <button
                className="btn btn--ghost btn--wide"
                type="button"
                disabled={busy}
                onClick={restoreSubscription}
              >
                Manage billing
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
              Payment is charged to your Apple Account. The subscription
              renews automatically unless cancelled at least 24 hours before
              the current period ends. You can manage or cancel it in your App
              Store account settings. <a href="/terms.html">Terms</a> ·{" "}
              <a href="/privacy.html">Privacy</a>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="authDialog__planSupport">
            {isNativeIOS && subscriptionProvider === "stripe"
              ? "Your Plink Pro plan is billed through the web."
              : "Thanks for supporting Plink."}
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
                  ? "Working..."
                  : isNativeIOS && subscriptionProvider === "stripe"
                    ? "Manage on web"
                    : "Manage subscription"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
