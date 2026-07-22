import "./HomeGuestPreview.css";

type GuestPreviewProps = {
  onOpenAuth: () => void;
};

export function HomeGuestPreview({ onOpenAuth }: GuestPreviewProps) {
  return (
    <section className="guestBanner" aria-label="Guest mode notice">
      <div className="guestBanner__content">
        <div className="guestBanner__eyebrow">
          <span className="guestBanner__icon" aria-hidden="true">!</span>
          <span>Guest mode</span>
        </div>
        <p className="guestBanner__copy">
          Your games are only available on this device right now. Sign in to keep
          sessions, players, and stats in your account.
        </p>
      </div>
      <div className="guestBanner__actions">
        <button
          className="btn btn--sm guestBanner__action"
          type="button"
          onClick={onOpenAuth}
        >
          Sign in to save
        </button>
      </div>
    </section>
  );
}
