import { forwardRef, useImperativeHandle, useRef } from "react";
import { ArrowRight, Check, Crown, X } from "lucide-react";
import "./ProFeatureGateDialog.css";

export type ProFeatureGateDialogHandle = {
  open: () => Promise<boolean>;
};

type Props = {
  onContinue: () => void;
};

export const ProFeatureGateDialog = forwardRef<
  ProFeatureGateDialogHandle,
  Props
>(function ProFeatureGateDialog({ onContinue }, ref) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  function closeWith(value: boolean) {
    dialogRef.current?.close();
    resolverRef.current?.(value);
    resolverRef.current = null;
  }

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        dialogRef.current?.showModal();
        return new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
        });
      },
    }),
    [],
  );

  return (
    <dialog
      className="dialog proGateDialog"
      ref={dialogRef}
      onClose={() => {
        if (resolverRef.current) closeWith(false);
      }}
    >
      <div className="proGateDialog__panel">
        <div className="proGateDialog__form">
          <button
            className="iconbtn proGateDialog__close"
            type="button"
            onClick={() => closeWith(false)}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>

          <div className="proGateDialog__hero">
            <div className="proGateDialog__eyebrow">Unlock team play</div>
            <div className="proGateDialog__heroTop">
              <span className="proGateDialog__heroBadge" aria-hidden="true">
                <Crown size={18} strokeWidth={2.3} />
              </span>
              <span className="proGateDialog__heroTag">Pro required</span>
            </div>
            <h2 className="proGateDialog__title">
              Build matches with saved teams, not just individual players.
            </h2>
          </div>

          <div className="proGateDialog__includes">
            <div className="proGateDialog__includesTitle">Pro also includes</div>
            <ul className="proGateDialog__featureList" aria-label="Pro features">
              <li>
                <Check size={16} strokeWidth={2.8} aria-hidden="true" />
                <span>Unlimited saved sessions</span>
              </li>
              <li>
                <Check size={16} strokeWidth={2.8} aria-hidden="true" />
                <span>Ad-free experience</span>
              </li>
              <li>
                <Check size={16} strokeWidth={2.8} aria-hidden="true" />
                <span>Advanced player stats and reporting</span>
              </li>
              <li>
                <Check size={16} strokeWidth={2.8} aria-hidden="true" />
                <span>Support our work</span>
              </li>
            </ul>
          </div>

          <div className="proGateDialog__note">
            Already on Pro? Your teams will unlock as soon as you sign in.
          </div>

          <div className="proGateDialog__actions">
            <button
              className="btn btn--ghost proGateDialog__secondary"
              type="button"
              onClick={() => closeWith(false)}
            >
              Not now
            </button>
            <button
              className="btn btn--primary proGateDialog__primary"
              type="button"
              onClick={() => {
                closeWith(true);
                onContinue();
              }}
            >
              <span>Sign in to unlock</span>
              <ArrowRight size={18} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
});
