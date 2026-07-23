import { Check, Plus, Search } from "lucide-react";
import type { GameTeam } from "../../../types";
import { NewPlayerComposer } from "../../../components/NewPlayerComposer/NewPlayerComposer";
import { avatarStyleFor } from "../../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../../utils/text";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function TeamMemberEditor({ team }: { team: GameTeam }) {
  const model = usePlayersScreenContext();
  const isAddingPlayers = model.expandedTeamAddPlayers.has(team.id);
  return (
    <section className="teamBuilderCard teamCard__builderSection teamCard__builderSection--flat">
      <div className="teamBuilderCard__head">
        <div className="teamBuilderCard__label">Team players</div>
        <div className="teamBuilderCard__badge">
          {model.editingTeamMemberIds.size} member
          {model.editingTeamMemberIds.size === 1 ? "" : "s"}
        </div>
      </div>
      <div className="teamCard__members">
        {model.profiles
          .filter((profile) => model.editingTeamMemberIds.has(profile.id))
          .map((profile) => {
            const isRequiredMember = model.editingTeamMemberIds.size === 1;
            return (
              <button
                key={profile.id}
                type="button"
                className="teamMemberChip"
                disabled={isRequiredMember}
                title={
                  isRequiredMember
                    ? "A team needs at least one player."
                    : `Remove ${profile.name} from this team`
                }
                onClick={() => toggleMember(model, profile.id)}
              >
                <span
                  className="teamMemberChip__avatar"
                  style={avatarStyleFor(profile.avatarColor)}
                  aria-hidden="true"
                >
                  {getInitials(profile.name)}
                </span>
                <span>
                  {profile.isAccountPlayer
                    ? formatAccountPlayerName(profile.name)
                    : profile.name}
                </span>
              </button>
            );
          })}
      </div>
      <button
        type="button"
        className="rosterPicker__createBtn rosterPicker__createBtn--dark"
        onClick={() => model.toggleTeamAddPlayers(team.id)}
      >
        <Plus size={17} strokeWidth={2.7} aria-hidden="true" />
        <span>{isAddingPlayers ? "Hide players" : "Add players"}</span>
      </button>
      {isAddingPlayers ? (
        <div className="teamEditor__addPanel teamEditor__addPanel--builder">
          <label className="teamBuilderSearch">
            <Search size={18} strokeWidth={2.4} aria-hidden="true" />
            <input
              className="teamBuilderSearch__input"
              placeholder="Search players..."
              value={model.editingTeamSearch}
              onChange={(event) =>
                model.setEditingTeamSearch(event.target.value)
              }
            />
          </label>
          <div
            className={`participantPicker__listShell teamBuilderListShell${model.editingTeamPlayerListFade.fadeState.top ? " participantPicker__listShell--fadeTop teamBuilderListShell--fadeTop" : ""}${model.editingTeamPlayerListFade.fadeState.bottom ? " participantPicker__listShell--fadeBottom teamBuilderListShell--fadeBottom" : ""}`}
          >
            <div
              ref={model.editingTeamPlayerListFade.ref}
              className="participantPicker__list teamBuilderPlayerList"
            >
              <div className="participantPicker__listContent">
                {model.editingTeamProfiles.map((profile) => {
                  const selected = model.editingTeamMemberIds.has(profile.id);
                  const isRequiredMember =
                    selected && model.editingTeamMemberIds.size === 1;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      className={`teamBuilderPlayerOption${selected ? " teamBuilderPlayerOption--selected" : ""}`}
                      disabled={!model.canUseTeams || isRequiredMember}
                      title={
                        isRequiredMember
                          ? "A team needs at least one player."
                          : undefined
                      }
                      onClick={() => toggleMember(model, profile.id)}
                      aria-pressed={selected}
                    >
                      <span className="teamBuilderPlayerOption__identity">
                        <span
                          className="teamBuilderPlayerOption__avatar"
                          style={avatarStyleFor(profile.avatarColor)}
                        >
                          {getInitials(profile.name)}
                        </span>
                        <strong>{profile.name}</strong>
                      </span>
                      <span className="teamBuilderPlayerOption__state">
                        {selected ? <Check size={17} /> : <Plus size={17} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <NewPlayerComposer
            className="teamBuilderCreatePlayer teamBuilderCreatePlayer--composer"
            triggerClassName="teamBuilderCreatePlayer__trigger"
            isOpen={
              model.creatingTeamPlayer &&
              model.creatingTeamPlayerForTeamId === team.id
            }
            showTrigger
            isAuthenticated={model.isAuthenticated}
            disabled={!model.canUseTeams}
            inputId={`team-edit-player-${team.id}`}
            name={model.newTeamPlayerName}
            color={model.newTeamPlayerColor}
            saveAsProfile
            showPersistenceControls={false}
            onOpen={() => {
              model.setCreatingTeamPlayer(true);
              model.setCreatingTeamPlayerForTeamId(team.id);
            }}
            onOpenAuth={model.onOpenAuth}
            onCancel={model.cancelTeamPlayerCreation}
            onAdd={() => model.createTeamPlayer(team.id)}
            onNameChange={model.setNewTeamPlayerName}
            onColorChange={model.setNewTeamPlayerColor}
            onSaveAsProfileChange={() => undefined}
          />
        </div>
      ) : null}
    </section>
  );
}

function toggleMember(
  model: ReturnType<typeof usePlayersScreenContext>,
  profileId: string,
) {
  model.setEditingTeamMemberIds((current) => {
    if (current.has(profileId) && current.size === 1) return current;
    const next = new Set(current);
    if (next.has(profileId)) next.delete(profileId);
    else next.add(profileId);
    return next;
  });
}
