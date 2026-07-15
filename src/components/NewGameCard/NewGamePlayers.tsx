import { avatarStyleFor } from "../../utils/color";
import {
  formatAccountPlayerName,
  formatPlayerName,
  getInitials,
} from "../../utils/text";
import { NewPlayerComposer } from "../NewPlayerComposer/NewPlayerComposer";
import { SearchableRosterPicker } from "../SearchableRosterPicker/SearchableRosterPicker";
import { useNewGameCardContext } from "./NewGameCardContext";
import { SelectionStateIcon } from "./NewGameAtoms";

export function NewGamePlayers() {
  const {
    visibleStagedPlayers,
    stagedPlayerListFade,
    selectedStagedPlayerIds,
    toggleStagedPlayer,
    participantSearch,
    setParticipantSearch,
    profiles,
    setIsAddingPlayer,
    filteredProfiles,
    selectedProfileIds,
    toggleProfile,
    isAddingPlayer,
    isAuthenticated,
    newPlayerName,
    newPlayerColor,
    saveAsProfile,
    newPlayerValidationMessage,
    onOpenAuth,
    addPlayer,
    setNewPlayerName,
    setNewPlayerColor,
    setSaveAsProfile,
  } = useNewGameCardContext();
  return (
    <>
      <>
        <div className="profilePicker__list">
          {visibleStagedPlayers.length > 0 ? (
            <div
              className={`participantPicker__listShell${
                stagedPlayerListFade.fadeState.top
                  ? " participantPicker__listShell--fadeTop"
                  : ""
              }${
                stagedPlayerListFade.fadeState.bottom
                  ? " participantPicker__listShell--fadeBottom"
                  : ""
              }`}
            >
              <div
                ref={stagedPlayerListFade.ref}
                className="participantPicker__list"
              >
                <div className="participantPicker__listContent">
                  {visibleStagedPlayers.map((player) => {
                    const selected = selectedStagedPlayerIds.has(player.id);

                    return (
                      <button
                        key={player.id}
                        type="button"
                        className={`participantOption${
                          selected ? " participantOption--active" : ""
                        }`}
                        onClick={() => toggleStagedPlayer(player.id)}
                      >
                        <span
                          className="participantOption__avatar"
                          style={avatarStyleFor(player.avatarColor)}
                        >
                          {getInitials(player.name)}
                        </span>

                        <span className="participantOption__copy">
                          <span className="participantOption__name">
                            {formatPlayerName(player.name)}
                          </span>
                          <span className="participantOption__hint">
                            Local player
                          </span>
                        </span>

                        <SelectionStateIcon selected={selected} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
          <SearchableRosterPicker
            variant="light"
            className="participantPicker__group"
            searchValue={participantSearch}
            onSearchChange={setParticipantSearch}
            searchPlaceholder="Search players"
            searchAriaLabel="Search saved players"
            clearAriaLabel="Clear player search"
            showSearch={profiles.length > 0 || !!participantSearch}
            showListImmediately
            emptyState={
              participantSearch
                ? "No saved players match that search."
                : visibleStagedPlayers.length === 0 && profiles.length === 0
                  ? "No saved players yet. Create one below."
                  : undefined
            }
            createButtonLabel="Add new player"
            onCreateButtonClick={() => setIsAddingPlayer(true)}
          >
            {filteredProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={`participantOption${
                  selectedProfileIds.has(profile.id)
                    ? " participantOption--active"
                    : ""
                }`}
                onClick={() => toggleProfile(profile.id)}
              >
                <span
                  className="participantOption__avatar"
                  style={avatarStyleFor(profile.avatarColor)}
                >
                  {getInitials(profile.name)}
                </span>
                <span className="participantOption__copy">
                  <span className="participantOption__name">
                    {profile.isAccountPlayer
                      ? formatAccountPlayerName(profile.name)
                      : profile.name}
                  </span>
                </span>
                <SelectionStateIcon
                  selected={selectedProfileIds.has(profile.id)}
                />
              </button>
            ))}
          </SearchableRosterPicker>
          <NewPlayerComposer
            isOpen={isAddingPlayer}
            showTrigger={false}
            isAuthenticated={isAuthenticated}
            name={newPlayerName}
            color={newPlayerColor}
            saveAsProfile={saveAsProfile}
            validationMessage={newPlayerValidationMessage}
            onOpen={() => setIsAddingPlayer(true)}
            onOpenAuth={onOpenAuth}
            onCancel={() => setIsAddingPlayer(false)}
            onAdd={addPlayer}
            onNameChange={setNewPlayerName}
            onColorChange={setNewPlayerColor}
            onSaveAsProfileChange={setSaveAsProfile}
          />
        </div>
      </>
    </>
  );
}
