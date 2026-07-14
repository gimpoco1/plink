import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import { TeamIcon } from "../TeamIcon/TeamIcon";
import { Plus, Search, X } from "lucide-react";
import { useNewGameCardContext } from "./NewGameCardContext";
import { SelectionStateIcon } from "./NewGameAtoms";

export function NewGameTeams() {
  const {
    availableTeams,
    teamListFade,
    participantSearch,
    setParticipantSearch,
    filteredTeams,
    selectedTeamIds,
    toggleTeam,
    openTeamsWorkspace,
    isAuthenticated,
    canUseTeams,
  } = useNewGameCardContext();
  return (
    <>
      <div className="teamPicker">
        {!isAuthenticated ? (
          <div className="teamPicker__empty">
            Sign in to build games from saved teams.
          </div>
        ) : !canUseTeams ? (
          <div className="teamPicker__empty">Team games are a Pro feature.</div>
        ) : availableTeams.length > 0 ? (
          <>
            <label className="participantPicker__search participantPicker__search--teams">
              <Search size={16} strokeWidth={2.4} aria-hidden="true" />
              <input
                type="text"
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Search teams"
                aria-label="Search saved teams"
              />
              {participantSearch ? (
                <button
                  type="button"
                  className="participantPicker__clear"
                  aria-label="Clear team search"
                  onClick={() => setParticipantSearch("")}
                >
                  <X size={15} strokeWidth={2.6} aria-hidden="true" />
                </button>
              ) : null}
            </label>
            <div
              className={`participantPicker__listShell${
                teamListFade.fadeState.top
                  ? " participantPicker__listShell--fadeTop"
                  : ""
              }${
                teamListFade.fadeState.bottom
                  ? " participantPicker__listShell--fadeBottom"
                  : ""
              }`}
            >
              <div ref={teamListFade.ref} className="teamPicker__list">
                <div className="participantPicker__listContent">
                  {filteredTeams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      className={`teamPicker__option${
                        selectedTeamIds.has(team.id)
                          ? " teamPicker__option--active"
                          : ""
                      }`}
                      onClick={() => toggleTeam(team.id)}
                    >
                      <span className="teamPicker__optionHead">
                        <span className="teamPicker__optionIdentity">
                          <span className="teamPicker__icon" aria-hidden="true">
                            <TeamIcon
                              icon={team.icon}
                              size={19}
                              strokeWidth={2.3}
                            />
                          </span>
                          <span className="teamPicker__optionCopy">
                            <strong>{team.name}</strong>
                            <span>{team.members.length} players</span>
                          </span>
                        </span>
                      </span>
                      <span
                        className="teamPicker__avatarsWrap"
                        aria-hidden="true"
                      >
                        <span className="teamPicker__avatars">
                          {team.members.map((member) => (
                            <span
                              key={`${team.id}-${member.id}`}
                              className="teamPicker__avatar"
                              style={avatarStyleFor(member.avatarColor)}
                            >
                              {getInitials(member.name)}
                            </span>
                          ))}
                        </span>
                        <SelectionStateIcon
                          selected={selectedTeamIds.has(team.id)}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {filteredTeams.length === 0 ? (
              <div className="teamPicker__empty">
                No saved teams match that search.
              </div>
            ) : null}
            <button
              type="button"
              className="teamPicker__createBtn"
              onClick={openTeamsWorkspace}
            >
              <Plus size={17} strokeWidth={2.7} aria-hidden="true" />
              Add new team
            </button>
          </>
        ) : (
          <>
            <div className="teamPicker__empty">
              No saved teams yet. Create your first roster from the Teams tab.
            </div>
            <button
              type="button"
              className="teamPicker__createBtn"
              onClick={openTeamsWorkspace}
            >
              <Plus size={17} strokeWidth={2.7} aria-hidden="true" />
              Add new team
            </button>
          </>
        )}
      </div>
    </>
  );
}
