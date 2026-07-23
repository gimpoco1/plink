import { Check, Plus } from "lucide-react";
import { NewPlayerComposer } from "../../../components/NewPlayerComposer/NewPlayerComposer";
import { SearchableRosterPicker } from "../../../components/SearchableRosterPicker/SearchableRosterPicker";
import { avatarStyleFor } from "../../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../../utils/text";
import { usePlayersScreenContext } from "../context/PlayersScreenContext";

export function TeamBuilderMembersStep() {
  const model = usePlayersScreenContext();
  return (
    <>
      <div className="teamBuilder__intro">
        <p className="teamBuilder__lede">
          Assemble your team from saved profiles or create new recruits on the
          fly.
        </p>
      </div>
      <section className="teamBuilderCard">
        <div className="teamBuilderCard__head">
          <div className="teamBuilderCard__label">Choose players</div>
          <div className="teamBuilderCard__badge">
            {model.newTeamSelectedProfiles.length} member
            {model.newTeamSelectedProfiles.length === 1 ? "" : "s"}
          </div>
        </div>
        <SearchableRosterPicker
          key={`new-team-roster-${model.recentTeamPlayerIds.join(":") || "default"}`}
          variant="dark"
          className="teamBuilderRosterPicker"
          listMaxHeight="184px"
          searchValue={model.newTeamSearch}
          onSearchChange={model.setNewTeamSearch}
          searchPlaceholder="Search players..."
          searchAriaLabel="Search saved players"
          clearAriaLabel="Clear player search"
          emptyState={
            model.profiles.length > 0
              ? "No matching saved players."
              : "No saved players yet."
          }
          createButtonLabel={
            model.creatingTeamPlayer &&
            model.creatingTeamPlayerForTeamId === null
              ? undefined
              : "Add new player"
          }
          onCreateButtonClick={
            model.creatingTeamPlayer &&
            model.creatingTeamPlayerForTeamId === null
              ? undefined
              : () => {
                  model.setCreatingTeamPlayer(true);
                  model.setCreatingTeamPlayerForTeamId(null);
                }
          }
        >
          {model.filteredNewTeamProfiles.map((profile) => {
            const selected = model.newTeamMemberIds.has(profile.id);
            return (
              <button
                key={profile.id}
                type="button"
                className={`teamBuilderPlayerOption${selected ? " teamBuilderPlayerOption--selected" : ""}`}
                disabled={!model.canUseTeams}
                onClick={() => model.toggleNewTeamMember(profile.id)}
                aria-pressed={selected}
              >
                <span className="teamBuilderPlayerOption__identity">
                  <span
                    className="teamBuilderPlayerOption__avatar"
                    style={avatarStyleFor(profile.avatarColor)}
                    aria-hidden="true"
                  >
                    {getInitials(profile.name)}
                  </span>
                  <span className="teamBuilderPlayerOption__copy">
                    <strong>
                      {profile.isAccountPlayer
                        ? formatAccountPlayerName(profile.name)
                        : profile.name}
                    </strong>
                  </span>
                </span>
                <span
                  className={`teamBuilderPlayerOption__state${selected ? " teamBuilderPlayerOption__state--selected" : ""}`}
                  aria-hidden="true"
                >
                  {selected ? (
                    <Check size={17} strokeWidth={2.8} />
                  ) : (
                    <Plus size={17} strokeWidth={2.8} />
                  )}
                </span>
              </button>
            );
          })}
        </SearchableRosterPicker>
        <NewPlayerComposer
          className="teamBuilderCreatePlayer teamBuilderCreatePlayer--inline teamBuilderCreatePlayer--composer"
          triggerClassName="teamBuilderCreatePlayer__trigger"
          isOpen={
            model.creatingTeamPlayer &&
            model.creatingTeamPlayerForTeamId === null
          }
          showTrigger={false}
          isAuthenticated={model.isAuthenticated}
          disabled={!model.canUseTeams}
          inputId="team-builder-player-name"
          name={model.newTeamPlayerName}
          color={model.newTeamPlayerColor}
          saveAsProfile
          showPersistenceControls={false}
          onOpen={() => {
            model.setCreatingTeamPlayer(true);
            model.setCreatingTeamPlayerForTeamId(null);
          }}
          onOpenAuth={model.onOpenAuth}
          onCancel={model.cancelTeamPlayerCreation}
          onAdd={() => model.createTeamPlayer()}
          onNameChange={model.setNewTeamPlayerName}
          onColorChange={model.setNewTeamPlayerColor}
          onSaveAsProfileChange={() => undefined}
        />
      </section>
      <section className="teamBuilderCard teamBuilderCard--summary">
        <div className="teamBuilderSummary">
          <div className="teamBuilderSummary__copy">
            <h4>Tactical Summary</h4>
            <p>{model.newTeamSummary}</p>
          </div>
          <div
            className="teamBuilderSummary__stack"
            style={model.summaryStackStyle}
            aria-hidden="true"
          >
            {model.newTeamSelectedProfiles.map((profile, index) => (
              <span
                key={profile.id}
                className="teamBuilderSummary__token"
                style={{
                  ...avatarStyleFor(profile.avatarColor),
                  zIndex: model.newTeamSelectedProfiles.length - index,
                }}
              >
                {getInitials(profile.name)}
              </span>
            ))}
            {model.newTeamSelectedProfiles.length === 0 ? (
              <span className="teamBuilderSummary__token teamBuilderSummary__token--ghost">
                +
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
