import { BarChart3, Check, History, LockKeyhole } from "lucide-react";
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
        <span>Or choose sessions only</span>
      </div>
      <section className="authDialog__sessionPass">
        <div className="authDialog__sessionPassHeading">
          <div>
            <span className="authDialog__sessionPassEyebrow">
              One-time · Sessions only
            </span>
            <strong>Session Pass</strong>
          </div>
        </div>

        <p className="authDialog__sessionPassValue">
          Keep more game history so player Stats are based on more of the games
          they’ve played.
        </p>

        <div className="authDialog__sessionPassBenefits">
          <span>
            <History size={16} strokeWidth={2.3} aria-hidden="true" />
            Store up to 100 sessions
          </span>
          <span>
            <BarChart3 size={16} strokeWidth={2.3} aria-hidden="true" />
            More complete Stats history
          </span>
        </div>

        <div className="authDialog__sessionPassLimitations">
          <LockKeyhole size={18} strokeWidth={2.3} aria-hidden="true" />
          <div>
            <strong>Does not unlock Pro</strong>
            <span>
              Ads remain. Teams, advanced Stats, and other Pro features stay
              locked.
            </span>
          </div>
        </div>

        {hasSessionPass ? (
          <div className="authDialog__sessionPassActive">
            <Check size={17} strokeWidth={2.6} aria-hidden="true" />
            Session Pass active · Account remains Free
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
              ? "Working..."
              : appleSessionPassError
                ? "Try App Store again"
                : appleSessionPassLoading
                  ? "Connecting to App Store…"
                  : `Buy Session Pass${price ? ` · ${price}` : ""}`}
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
