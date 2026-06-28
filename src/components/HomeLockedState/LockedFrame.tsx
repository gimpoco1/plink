import "./HomeLockedState.css";

type LockedFrameProps = {
  title: string;
  onSignIn: () => void;
  children: React.ReactNode;
};

export function LockedFrame({ title, onSignIn, children }: LockedFrameProps) {
  return (
    <div className="lockedFrame">
      <div className="lockedFrame__content" aria-hidden="true">{children}</div>
      <button className="lockedFrame__cta" type="button" onClick={onSignIn}>
        <span className="lockedFrame__panel">
          <span className="lockedFrame__eyebrow">Locked</span>
          <strong>{title}</strong>
          <span className="lockedFrame__action"><span>Sign in</span><span className="lockedFrame__actionIcon" aria-hidden="true">→</span></span>
        </span>
      </button>
    </div>
  );
}
