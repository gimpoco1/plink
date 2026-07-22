import { Link } from "lucide-react";
import { NewPlayerComposer } from "../NewPlayerComposer/NewPlayerComposer";
import { SearchableRosterPicker } from "../SearchableRosterPicker/SearchableRosterPicker";
import { useManagePlayersDialogContext } from "./ManagePlayersDialogContext";
import { ManagePlayerCard } from "./ManagePlayerCard";
import { ManagePlayersQueue } from "./ManagePlayersQueue";

export function ManagePlayersSavedSection() {
  const {
    close,
    filteredProfiles,
    isAuthenticated,
    isCreating,
    newPlayerValidationMessage,
    onOpenTeamsTab,
    onInviteOthers,
    pendingName,
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
    submit,
  } = useManagePlayersDialogContext();

  function openComposer() {
    setIsCreating(true);
  }

  return (
    <section className="managePlayersDialog__section managePlayersDialog__section--saved">
      <SearchableRosterPicker
        variant="dark"
        className="managePlayersDialog__savedPicker"
        listMaxHeight="170px"
        showListImmediately={showRosterImmediately}
        searchValue={search}
        onSearchChange={setSearch}
        listTitle={isAuthenticated ? "Saved players" : "Add players"}
        collapseLabel="Hide players"
        searchPlaceholder="Search players"
        searchAriaLabel="Search saved players"
        clearAriaLabel="Clear player search"
        showSearch={isAuthenticated && (profiles.length > 0 || !!search)}
        emptyState={
          search
            ? "No saved players match that search."
            : isAuthenticated && profiles.length > 0
              ? "Every saved player is already in this game."
              : isAuthenticated
                ? "No saved players yet."
                : "Add a player for this game below."
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
        {filteredProfiles.map((profile) => (
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
