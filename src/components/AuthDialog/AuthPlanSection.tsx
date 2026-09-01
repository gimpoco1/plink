import { translate } from "../../i18n/translate";
import { ChevronDown, Crown } from "lucide-react";
import { AuthPlanDetails } from "./AuthPlanDetails";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthPlanSection() {
  const {
    entitlementsLoading,
    hasSessionPass,
    isPro,
    planSectionRef,
    renewalLabel,
    setShowPlanDetails,
    showPlanDetails,
    sinceLabel,
    source,
  } = useAuthDialogContext();
  return (
    <section className="authDialog__planSection" ref={planSectionRef}>
      <div
        className={`authDialog__planCard${showPlanDetails ? "" : " authDialog__planCard--collapsed"}`}
      >
        {!entitlementsLoading && !isPro && !showPlanDetails ? (
          <div className="authDialog__planHeader">
            <div className="authDialog__planToggleHeader authDialog__planToggleHeader--static">
              <div className="authDialog__planTop">
                <div className="authDialog__planTitleWrap">
                  <div className="authDialog__accountIdentityTop">
                    <span className="authDialog__accountPlayerTitle">
                      {translate("copy.plan")}
                    </span>
                    {!entitlementsLoading ? (
                      <span
                        className={`authDialog__accountPlanBadge authDialog__accountPlanBadge--${
                          isPro ? "pro" : "free"
                        }`}
                      >
                        {isPro ? "PRO" : "FREE"}
                      </span>
                    ) : null}
                  </div>{" "}
                  <strong className="authDialog__planName">
                    <span>
                      {hasSessionPass ? translate("copy.freeSessionPass") : translate("copy.freePlan")}
                    </span>
                  </strong>
                  <span className="authDialog__planMeta">
                    {hasSessionPass
                      ? translate("copy.sessionPassPlanDescription")
                      : translate("copy.freePlanDescription")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : entitlementsLoading && !showPlanDetails ? (
          <div className="authDialog__planHeader">
            <div className="authDialog__planToggleHeader authDialog__planToggleHeader--static">
              <div className="authDialog__planTop">
                <div className="authDialog__planTitleWrap">
                  <span className="authDialog__accountPlayerTitle">
                    {translate("copy.plan")}
                  </span>
                  <strong className="authDialog__planName">
                    <span>{translate("copy.loadingPlan")}</span>
                  </strong>
                  <span className="authDialog__planMeta">
                    {translate("copy.checkingYourSubscriptionDetails")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="authDialog__planHeader">
            <button
              type="button"
              className="authDialog__planToggleHeader"
              onClick={() => setShowPlanDetails((value) => !value)}
              aria-expanded={showPlanDetails}
              aria-controls="auth-plan-details"
            >
              <div className="authDialog__planTop">
                <div className="authDialog__planTitleWrap">
                  <div className="authDialog__accountIdentityTop">
                    <span className="authDialog__accountPlayerTitle">
                      {translate("copy.plan")}
                    </span>
                    {!entitlementsLoading ? (
                      <span
                        className={`authDialog__accountPlanBadge authDialog__accountPlanBadge--${
                          isPro ? "pro" : "free"
                        }`}
                      >
                        {isPro ? "PRO" : "FREE"}
                      </span>
                    ) : null}
                  </div>
                  <strong className="authDialog__planName">
                    {isPro ? (
                      <span className="authDialog__planNameMain">
                        <span
                          className="authDialog__planNameAccent"
                          aria-hidden="true"
                        >
                          <Crown size={14} strokeWidth={2.4} />
                        </span>
                        <span className="authDialog__planNameText">
                          <span>Plink Pro</span>
                          {sinceLabel ? (
                            <span className="authDialog__planSince">
                              {sinceLabel}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    ) : (
                      <span>
                        {hasSessionPass ? translate("copy.freeSessionPass") : translate("copy.freePlan")}
                      </span>
                    )}
                  </strong>
                  <span className="authDialog__planMeta">
                    {isPro
                      ? source === "subscription" && renewalLabel
                        ? renewalLabel
                        : translate("copy.proPlanDescription")
                      : hasSessionPass
                        ? translate("copy.sessionPassPlanDescription")
                        : translate("copy.freePlanDescription")}
                  </span>
                </div>
                <div className="authDialog__planHeaderRight">
                  <span
                    className={`authDialog__storageChevron${showPlanDetails ? " authDialog__storageChevron--open" : ""}`}
                    aria-hidden="true"
                  >
                    <ChevronDown size={18} strokeWidth={2.2} />
                  </span>
                </div>
              </div>
            </button>
          </div>
        )}
        {!entitlementsLoading && !isPro && !showPlanDetails ? (
          <button
            type="button"
            className="btn btn--primary btn--wide authDialog__planExpandCta authDialog__planExpandCta--bottom"
            onClick={() => setShowPlanDetails(true)}
          >
            <Crown size={16} strokeWidth={2.3} aria-hidden="true" />
            {hasSessionPass ? translate("copy.viewPro") : translate("copy.viewOptions")}
          </button>
        ) : null}
        {showPlanDetails ? <AuthPlanDetails /> : null}
      </div>
    </section>
  );
}
