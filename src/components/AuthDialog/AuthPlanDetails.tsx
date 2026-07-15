import { Check, Coffee, Croissant } from "lucide-react";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthPlanDetails() {
  const {
    billingPeriodOptionRefs,
    busy,
    handleBillingPeriodRadioKeyDown,
    hasStripeBillingProfile,
    isNativeIOS,
    isPro,
    restoreSubscription,
    selectedBillingPeriod,
    setSelectedBillingPeriod,
    source,
    startUpgradeFlow,
  } = useAuthDialogContext();
  return (
    <div id="auth-plan-details" className="authDialog__planBody">
      {!isPro && !isNativeIOS ? (
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
                <span>2.99 EUR / month</span>
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
                <span>17.99 EUR / year</span>
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
              disabled={busy}
              onClick={startUpgradeFlow}
            >
              {busy
                ? "Working..."
                : selectedBillingPeriod === "monthly"
                  ? "Buy Pro Monthly"
                  : "Buy Pro Yearly"}
            </button>
            {hasStripeBillingProfile ? (
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
        </>
      ) : !isPro ? (
        <div className="authDialog__planSupport">
          Pro purchases are being prepared for Apple In-App Purchase. This iOS
          build does not open web checkout.
        </div>
      ) : (
        <>
          <div className="authDialog__planSupport">
            Thanks for supporting Plink.
          </div>
          {source === "subscription" && !isNativeIOS ? (
            <div className="authDialog__planActions">
              <button
                className="btn btn--ghost btn--wide"
                type="button"
                disabled={busy}
                onClick={restoreSubscription}
              >
                {busy ? "Working..." : "Manage subscription"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
