import { translate } from "../../../i18n/translate";
import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";
import { TeamIconPicker } from "./PlayersScreenParts";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function TeamBuilderIdentityStep() {
  const {
    canUseTeams,
    newTeamIcon,
    newTeamName,
    setNewTeamIcon,
    setNewTeamName,
    setNewTeamStep,
  } = usePlayersScreenContext();
  return (
    <>
      <div className="teamBuilder__intro">
        <p className="teamBuilder__lede">
          {translate("copy.setYourTeamSVisualIdentityForSavedRostersAndTeamBased")}
        </p>
      </div>
      <section className="teamBuilderCard teamBuilderCard--identity">
        <div className="teamBuilderIdentity teamBuilderIdentity--compact">
          <div className="teamBuilderIdentity__preview" aria-hidden="true">
            <div className="teamBuilderIdentity__badge teamBuilderIdentity__badge--compact">
              <TeamIcon icon={newTeamIcon} size={22} strokeWidth={2.2} />
            </div>
          </div>
          <div className="teamBuilderIdentity__field">
            <label
              className="teamBuilder__sectionEyebrow"
              htmlFor="team-builder-name"
            >
              {translate("copy.teamName")}
            </label>
            <div className="teamBuilderIdentity__nameRow">
              <input
                id="team-builder-name"
                autoFocus
                className="teamBuilder__input teamBuilder__input--hero"
                placeholder={
                  canUseTeams
                    ? "e.g. The Aces"
                    : "Team creation is available on Pro"
                }
                value={newTeamName}
                disabled={!canUseTeams}
                onChange={(event) => setNewTeamName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && newTeamName.trim())
                    setNewTeamStep(2);
                }}
              />
            </div>
          </div>
        </div>
        <div className="teamBuilderCard__group">
          <div className="teamBuilderCard__label">
            {translate("copy.chooseYourInsignia")}
          </div>
          <TeamIconPicker
            value={newTeamIcon}
            onChange={setNewTeamIcon}
            label={translate("copy.newTeam")}
            layout="grid"
            density="compact"
          />
        </div>
      </section>
    </>
  );
}
