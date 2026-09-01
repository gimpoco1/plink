import { translate } from "../../i18n/translate";
import { Check, Info, Link, LockKeyhole, Plus } from "lucide-react";
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
        listTriggerLabel={translate("copy.addPlayers")}
        searchValue={search}
        onSearchChange={setSearch}
        listTitle={isAuthenticated ? translate("tabs.players") : translate("copy.addPlayers")}
        collapseLabel={translate("copy.hidePlayers")}
        searchPlaceholder={translate("new.searchPlayers")}
        searchAriaLabel={translate("copy.searchSavedPlayers")}
        clearAriaLabel={translate("copy.clearPlayerSearch")}
        showSearch={
          isAuthenticated &&
          (profiles.length > 0 || pastLinkedPlayers.length > 0 || !!search)
        }
        emptyState={
          search
            ? translate("copy.noPlayersMatchThatSearch")
            : isAuthenticated &&
                (profiles.length > 0 || pastLinkedPlayers.length > 0)
              ? translate("copy.everyAvailablePlayerIsAlreadyInThisGame")
              : isAuthenticated
                ? translate("copy.noSavedPlayersYet")
                : translate("copy.addAPlayerForThisGameBelow")
        }
        listFooterContent={
          stagedPastLinkedUserIds.size > 0 ||
          filteredPastLinkedPlayers.some((player) => !player.canInvite) ? (
            <div className="managePlayersDialog__selectionNotices">
              {stagedPastLinkedUserIds.size > 0 ? (
                <div className="managePlayersDialog__selectionNotice">
                  <Link size={15} strokeWidth={2.4} aria-hidden="true" />
                  <span>
                    <strong>{translate("copy.invitedPlayers")}</strong>
                    {translate("copy.thisGameAppearsInTheirAccountsAndTheyCanUpdateTheScore")}
                  </span>
                </div>
              ) : null}
              {filteredPastLinkedPlayers.some((player) => !player.canInvite) ? (
                <div className="managePlayersDialog__selectionNotice managePlayersDialog__selectionNotice--blocked">
                  <Info size={15} strokeWidth={2.4} aria-hidden="true" />
                  <span>
                    <strong>{translate("copy.inviteCodeRequired")}</strong>
                    {translate("copy.playersMarkedCodeOnlyTurnedOffAutomaticInvitesShareANewCode")}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null
        }
        createButtonLabel={translate("copy.addNewPlayer")}
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
          const blocked = !player.canInvite;
          return (
            <button
              key={player.userId}
              className={`managePlayersDialog__invitedOption${
                selected ? " managePlayersDialog__invitedOption--selected" : ""
              }${
                blocked ? " managePlayersDialog__invitedOption--blocked" : ""
              }`}
              type="button"
              onClick={() => togglePastLinkedPlayer(player.userId)}
              aria-pressed={selected}
              disabled={blocked}
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
                    {translate("copy.invitedBefore")}</span>
                </span>
              </span>
              <span
                className={`managePlayersDialog__invitedState${
                  selected
                    ? " managePlayersDialog__invitedState--selected"
                    : blocked
                      ? " managePlayersDialog__invitedState--blocked"
                      : ""
                }`}
                aria-hidden="true"
              >
                {blocked ? (
                  <>
                    <LockKeyhole size={13} strokeWidth={2.5} />
                    {translate("copy.codeOnly")}
                  </>
                ) : selected ? (
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
          {translate("copy.shareInviteCode")}</button>
      ) : null}
      <ManagePlayersQueue />
    </section>
  );
}
