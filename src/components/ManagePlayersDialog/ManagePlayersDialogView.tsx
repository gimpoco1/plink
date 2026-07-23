import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";
import { ManagePlayersCurrentSection } from "./ManagePlayersCurrentSection";
import { ManagePlayersSavedSection } from "./ManagePlayersSavedSection";
import { ManageTeamsSection } from "./ManageTeamsSection";

export function ManagePlayersDialogView() {
  const {
    close,
    dialogRef,
    isPlayersGame,
    isTeamsGame,
    resetState,
    stagedCount,
    stagedTeamCount,
    submitLabel,
    submitPlayers,
    submitTeams,
    teamSubmitLabel,
  } = useManagePlayersDialogContext();

  return (
    <dialog
      className="dialog managePlayersDialog"
      ref={dialogRef}
      onClose={resetState}
    >
      <div className="dialog__form">
        <div className="dialog__head managePlayersDialog__head">
          <div>
            <div className="managePlayersDialog__eyebrow">Game roster</div>
            <div className="dialog__title">
              {isTeamsGame ? "Manage teams" : "Manage players"}
            </div>
          </div>
          <button
            className="iconbtn"
            type="button"
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="dialog__body managePlayersDialog__body">
          <div className="managePlayersDialog__sections">
            {isTeamsGame ? <ManageTeamsSection /> : null}
            {isPlayersGame ? (
              <>
                <ManagePlayersCurrentSection />
                <ManagePlayersSavedSection />
              </>
            ) : null}
          </div>

          <div className="managePlayersDialog__footer">
            {isPlayersGame && stagedCount > 0 ? (
              <div className="dialog__actions managePlayersDialog__submitRow managePlayersDialog__submitRow--players">
                <button
                  className="btn btn--primary btn--wide"
                  type="button"
                  onClick={() => void submitPlayers()}
                >
                  {submitLabel}
                </button>
              </div>
            ) : isTeamsGame && stagedTeamCount > 0 ? (
              <div className="dialog__actions managePlayersDialog__submitRow managePlayersDialog__submitRow--teams">
                <button
                  className="btn btn--primary btn--wide"
                  type="button"
                  onClick={submitTeams}
                >
                  {teamSubmitLabel}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </dialog>
  );
}
