import { translate } from "../../i18n/translate";
import "./HomeGuestPreview.css";

type GuestPreviewProps = {
  onOpenAuth: () => void;
};

export function HomeGuestPreview({ onOpenAuth }: GuestPreviewProps) {
  return (
    <section
      className="guestBanner"
      aria-label={translate("copy.guestModeNotice")}
    >
      <div className="guestBanner__content">
        <div className="guestBanner__eyebrow">
          <span className="guestBanner__icon" aria-hidden="true">
            !
          </span>
          <span>{translate("copy.guestMode")}</span>
        </div>
        <p className="guestBanner__copy">
          {translate(
            "copy.yourGamesAreOnlyAvailableOnThisDeviceRightNowSignIn",
          )}
        </p>
      </div>
      <div className="guestBanner__actions">
        <button
          className="btn btn--ghost btn--sm guestBanner__action"
          type="button"
          onClick={onOpenAuth}
        >
          {translate("copy.signInToSave")}
        </button>
      </div>
    </section>
  );
}
