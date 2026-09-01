import { translate } from "../../i18n/translate";
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
  ctaLabel,
  children,
}: LockedFrameProps) {
  const resolvedCtaLabel = ctaLabel ?? translate("topbar.signIn");

  return (
    <div className="lockedFrame">
      <div className="lockedFrame__content" aria-hidden="true">
        {children}
      </div>
      <button className="lockedFrame__cta" type="button" onClick={onSignIn}>
        <span className="lockedFrame__panel">
          <span className="lockedFrame__eyebrow">
            {translate("copy.locked")}
          </span>
          <strong>{title}</strong>
          <span className="lockedFrame__action">
            <span>{resolvedCtaLabel}</span>
            <span className="lockedFrame__actionIcon" aria-hidden="true">
              →
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
