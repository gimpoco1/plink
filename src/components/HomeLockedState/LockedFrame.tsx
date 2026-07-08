import "./HomeLockedState.css";

type LockedFrameProps = {
  title: string;
  onSignIn: () => void;
  ctaLabel?: string;
  children: React.ReactNode;
};

export function LockedFrame({
  title,
  onSignIn,
  ctaLabel = "Sign in",
  children,
}: LockedFrameProps) {
  return (
    <div className="lockedFrame">
      <div className="lockedFrame__content" aria-hidden="true">
        {children}
      </div>
      <button className="lockedFrame__cta" type="button" onClick={onSignIn}>
        <span className="lockedFrame__panel">
          <span className="lockedFrame__eyebrow">Locked</span>
          <strong style={{ whiteSpace: "nowrap" }}>{title}</strong>
          <span className="lockedFrame__action">
            <span>{ctaLabel}</span>
            <span className="lockedFrame__actionIcon" aria-hidden="true">
              →
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
