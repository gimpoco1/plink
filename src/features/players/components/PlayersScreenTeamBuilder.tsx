import { translate } from "../../../i18n/translate";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { TeamBuilderIdentityStep } from "./PlayersScreenTeamBuilderIdentity";
import { TeamBuilderMembersStep } from "./PlayersScreenTeamBuilderMembers";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function TeamBuilder() {
  const {
    canUseTeams,
    closeTeamBuilder,
    createTeam,
    newTeamMemberIds,
    newTeamName,
    newTeamStep,
    setNewTeamStep,
  } = usePlayersScreenContext();
  return (
    <div className="teamBuilder">
      <div className="teamBuilder__header">
        <button
          type="button"
          className="teamBuilder__close"
          aria-label={translate("copy.closeTeamBuilder")}
          onClick={closeTeamBuilder}
        >
          <X size={22} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <div className="teamBuilder__headerCopy">
          <div className="teamBuilder__eyebrow">
            {translate("copy.buildTeam")}
          </div>
          <h3 className="teamBuilder__title">
            {newTeamStep === 1 ? "Team Identity" : "Recruit Players"}
          </h3>
        </div>
        <div className="teamBuilder__step">{translate("copy.step")} {newTeamStep} {translate("copy.of2")}</div>
      </div>
      <div className="teamBuilder__progress" aria-hidden="true">
        <span
          className={`teamBuilder__progressSegment${newTeamStep === 1 ? " teamBuilder__progressSegment--current" : " teamBuilder__progressSegment--complete"}`}
        />
        <span
          className={`teamBuilder__progressSegment${newTeamStep === 2 ? " teamBuilder__progressSegment--current" : ""}`}
        />
      </div>
      {newTeamStep === 1 ? (
        <TeamBuilderIdentityStep />
      ) : (
        <TeamBuilderMembersStep />
      )}
      <div
        className={`teamBuilder__footer${newTeamStep === 1 ? " teamBuilder__footer--single" : ""}`}
      >
        {newTeamStep === 2 ? (
          <button
            type="button"
            className="btn btn--ghost teamBuilder__footerButton"
            onClick={() => setNewTeamStep(1)}
          >
            <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
            {translate("copy.back")}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--primary teamBuilder__footerButton teamBuilder__footerButton--primary"
          disabled={
            newTeamStep === 1
              ? !canUseTeams || !newTeamName.trim()
              : !canUseTeams ||
                !newTeamName.trim() ||
                newTeamMemberIds.size === 0
          }
          onClick={() => {
            if (newTeamStep === 1) setNewTeamStep(2);
            else createTeam();
          }}
        >
          {newTeamStep === 1 ? translate("copy.continue") : translate("copy.createTeam")}
          <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
