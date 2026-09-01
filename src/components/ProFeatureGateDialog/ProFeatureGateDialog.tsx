import { translate } from "../../i18n/translate";
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
            aria-label={translate("copy.close")}
          >
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>

          <div className="proGateDialog__hero">
            <div className="proGateDialog__eyebrow">
              {translate("copy.unlockTeamPlay")}
            </div>
            <div className="proGateDialog__heroTop">
              <span className="proGateDialog__heroBadge" aria-hidden="true">
                <Crown size={18} strokeWidth={2.3} />
              </span>
              <span className="proGateDialog__heroTag">
                {translate("copy.proRequired")}
              </span>
            </div>
            <h2 className="proGateDialog__title">
              {translate("copy.buildMatchesWithSavedTeamsNotJustIndividualPlayers")}
            </h2>
          </div>

          <div className="proGateDialog__includes">
            <div className="proGateDialog__includesTitle">
              {translate("copy.proAlsoIncludes")}
            </div>
            <ul
              className="proGateDialog__featureList"
              aria-label={translate("copy.proFeatures")}
            >
              <li>
                <Check size={16} strokeWidth={2.8} aria-hidden="true" />
                <span>{translate("copy.unlimitedSavedSessions")}</span>
              </li>
              <li>
                <Check size={16} strokeWidth={2.8} aria-hidden="true" />
                <span>
                  {translate("copy.advancedPlayerStatsAndReporting")}
                </span>
              </li>
              <li>
                <Check size={16} strokeWidth={2.8} aria-hidden="true" />
                <span>{translate("copy.supportOurWork")}</span>
              </li>
            </ul>
          </div>

          <div className="proGateDialog__note">
            {translate("copy.alreadyOnProYourTeamsWillUnlockAsSoonAsYouSign")}
          </div>

          <div className="proGateDialog__actions">
            <button
              className="btn btn--ghost proGateDialog__secondary"
              type="button"
              onClick={() => closeWith(false)}
            >
              {translate("copy.notNow")}
            </button>
            <button
              className="btn btn--primary proGateDialog__primary"
              type="button"
              onClick={() => {
                closeWith(true);
                onContinue();
              }}
            >
              <span>{translate("copy.signInToUnlock")}</span>
              <ArrowRight size={18} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
});
