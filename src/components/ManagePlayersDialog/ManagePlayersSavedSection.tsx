import { Check, Link, Plus } from "lucide-react";
import { avatarStyleFor } from "../../utils/color";
import { capitalizeFirst, getInitials } from "../../utils/text";
import { NewPlayerComposer } from "../NewPlayerComposer/NewPlayerComposer";
import { SearchableRosterPicker } from "../SearchableRosterPicker/SearchableRosterPicker";
import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";
import { ManagePlayerCard } from "./ManagePlayerCard";
import { ManagePlayersQueue } from "./ManagePlayersQueue";

export function ManagePlayersSavedSection() {
  const {
    close,
    filteredPastLinkedPlayers,
    filteredProfiles,
    isAuthenticated,
    isCreating,
    newPlayerValidationMessage,
    onOpenTeamsTab,
    onInviteOthers,
    pendingName,
    pastLinkedPlayers,
    profiles,
    saveForLater,
    search,
    selectedColor,
    setIsCreating,
    setPendingName,
    setSaveForLater,
    setSearch,
    setSelectedColor,
    showRosterImmediately,
    stagedPastLinkedUserIds,
    submit,
    togglePastLinkedPlayer,
  } = useManagePlayersDialogContext();

  function openComposer() {
    setIsCreating(true);
  }

  return (
    <section className="managePlayersDialog__section managePlayersDialog__section--saved">
      <SearchableRosterPicker
        variant="dark"
        className="managePlayersDialog__savedPicker"
        listMaxHeight="240px"
        showListImmediately={showRosterImmediately}
        listTriggerLabel="Add players"
        searchValue={search}
        onSearchChange={setSearch}
        listTitle={isAuthenticated ? "Players" : "Add players"}
        collapseLabel="Hide players"
        searchPlaceholder="Search players"
        searchAriaLabel="Search saved players"
        clearAriaLabel="Clear player search"
        showSearch={
          isAuthenticated &&
          (profiles.length > 0 || pastLinkedPlayers.length > 0 || !!search)
        }
        emptyState={
          search
            ? "No players match that search."
            : isAuthenticated &&
                (profiles.length > 0 || pastLinkedPlayers.length > 0)
              ? "Every available player is already in this game."
              : isAuthenticated
                ? "No saved players yet."
                : "Add a player for this game below."
        }
        listFooterContent={
          stagedPastLinkedUserIds.size > 0 ? (
            <div className="managePlayersDialog__selectionNotice">
              <Link size={15} strokeWidth={2.4} aria-hidden="true" />
              <span>
                <strong>Invited players</strong>
                This game appears in their accounts and they can update the
                score. Their results count toward their Stats.
              </span>
            </div>
          ) : null
        }
        createButtonLabel="Add new player"
        onCreateButtonClick={openComposer}
        footerContent={
          <NewPlayerComposer
            isOpen={isCreating}
            showTrigger={false}
            isAuthenticated={isAuthenticated}
            name={pendingName}
            color={selectedColor}
            saveAsProfile={saveForLater}
            validationMessage={newPlayerValidationMessage}
            showPersistenceControls={isAuthenticated}
            onOpen={openComposer}
            onOpenAuth={onOpenTeamsTab}
            onCancel={() => setIsCreating(false)}
            onAdd={submit}
            onNameChange={setPendingName}
            onColorChange={setSelectedColor}
            onSaveAsProfileChange={setSaveForLater}
          />
        }
      >
        {filteredProfiles
          .filter((profile) => profile.isAccountPlayer)
          .map((profile) => (
            <ManagePlayerCard key={profile.id} kind="saved" profile={profile} />
          ))}
        {filteredPastLinkedPlayers.map((player) => {
          const selected = stagedPastLinkedUserIds.has(player.userId);
          return (
            <button
              key={player.userId}
              className={`managePlayersDialog__invitedOption${
                selected ? " managePlayersDialog__invitedOption--selected" : ""
              }`}
              type="button"
              onClick={() => togglePastLinkedPlayer(player.userId)}
              aria-pressed={selected}
            >
              <span
                className="managePlayersDialog__avatar"
                style={avatarStyleFor(player.avatarColor)}
                aria-hidden="true"
              >
                {getInitials(player.name)}
              </span>
              <span className="managePlayersDialog__invitedIdentity">
                <span className="managePlayersDialog__invitedNameRow">
                  <span className="managePlayersDialog__name">
                    {capitalizeFirst(player.name)}
                  </span>
                  <span className="managePlayersDialog__invitedBadge">
                    <Link size={9} strokeWidth={2.7} aria-hidden="true" />
                    Invited before
                  </span>
                </span>
              </span>
              <span
                className={`managePlayersDialog__invitedState${
                  selected
                    ? " managePlayersDialog__invitedState--selected"
                    : ""
                }`}
                aria-hidden="true"
              >
                {selected ? (
                  <Check size={15} strokeWidth={3} />
                ) : (
                  <Plus size={16} strokeWidth={2.8} />
                )}
              </span>
            </button>
          );
        })}
        {filteredProfiles
          .filter((profile) => !profile.isAccountPlayer)
          .map((profile) => (
            <ManagePlayerCard key={profile.id} kind="saved" profile={profile} />
          ))}
      </SearchableRosterPicker>
      {onInviteOthers ? (
        <button
          className="managePlayersDialog__inviteOthers"
          type="button"
          onClick={() => {
            close();
            onInviteOthers();
          }}
        >
          <Link size={16} strokeWidth={2.4} aria-hidden="true" />
          Share invite code
        </button>
      ) : null}
      <ManagePlayersQueue />
    </section>
  );
}
