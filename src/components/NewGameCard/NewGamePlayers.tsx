import { translate } from "../../i18n/translate";
import { avatarStyleFor } from "../../utils/color";
import {
  formatAccountPlayerName,
  formatPlayerName,
  getInitials,
} from "../../utils/text";
import { Info, Link, LockKeyhole, Trash2 } from "lucide-react";
import { NewPlayerComposer } from "../NewPlayerComposer/NewPlayerComposer";
import { SearchableRosterPicker } from "../SearchableRosterPicker/SearchableRosterPicker";
import { SwipeableCard } from "../SwipeableCard/SwipeableCard";
import { useNewGameCardContext } from "./NewGameCardContext";
import { SelectionStateIcon } from "./NewGameAtoms";
import { useI18n } from "../../i18n/I18nContext";

export function NewGamePlayers() {
  const { t } = useI18n();
  const {
    filteredStagedPlayers,
    selectedStagedPlayerIds,
    toggleStagedPlayer,
    deleteStagedPlayer,
    participantSearch,
    setParticipantSearch,
    profiles,
    setIsAddingPlayer,
    filteredProfiles,
    filteredPastInvitedPlayers,
    selectedProfileIds,
    selectedPastInvitedUserIds,
    toggleProfile,
    togglePastInvitedPlayer,
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

  function renderSavedProfile(profile: (typeof filteredProfiles)[number]) {
    return (
      <button
        key={profile.id}
        type="button"
        className={`participantOption${
          selectedProfileIds.has(profile.id) ? " participantOption--active" : ""
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
        <SelectionStateIcon selected={selectedProfileIds.has(profile.id)} />
      </button>
    );
  }

  return (
    <>
      <>
        <div className="profilePicker__list">
          <SearchableRosterPicker
            variant="light"
            className="participantPicker__group"
            searchValue={participantSearch}
            onSearchChange={setParticipantSearch}
            searchPlaceholder={t("new.searchPlayers")}
            searchAriaLabel={translate("copy.searchSavedPlayers")}
            clearAriaLabel={translate("copy.clearPlayerSearch")}
            showSearch={
              profiles.length > 0 ||
              filteredStagedPlayers.length > 0 ||
              filteredPastInvitedPlayers.length > 0 ||
              !!participantSearch
            }
            showListImmediately
            emptyState={
              participantSearch
                ? translate("copy.noPlayersMatchThatSearch")
                : filteredStagedPlayers.length === 0 &&
                    profiles.length === 0 &&
                    filteredPastInvitedPlayers.length === 0
                  ? translate("copy.noSavedPlayersYetCreateOneBelow")
                  : undefined
            }
            listFooterContent={
              selectedPastInvitedUserIds.size > 0 ||
              selectedStagedPlayerIds.size > 0 ? (
                <div className="participantPicker__selectionNotices">
                  {selectedPastInvitedUserIds.size > 0 ? (
                    <div className="participantPicker__selectionNotice">
                      <Link size={15} strokeWidth={2.4} aria-hidden="true" />
                      <span>
                        <strong>
                          {translate("copy.invitedBeforePlayers")}
                        </strong>{" "}
                        {translate("copy.theyLlSeeThisGameInTheirAccountsAndCanUpdateThe")}
                      </span>
                    </div>
                  ) : null}
                  {selectedStagedPlayerIds.size > 0 ? (
                    <div className="participantPicker__selectionNotice">
                      <Info size={15} strokeWidth={2.4} aria-hidden="true" />
                      <span>
                        <strong>{translate("copy.localPlayers")}</strong>{" "}
                        {translate("copy.resultsStayInThisGameOnlyAndWonTBeAddedTo")}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null
            }
            createButtonLabel={translate("copy.addNewPlayer")}
            onCreateButtonClick={() => setIsAddingPlayer(true)}
          >
            {filteredProfiles
              .filter((profile) => profile.isAccountPlayer)
              .map(renderSavedProfile)}
            {filteredPastInvitedPlayers.map((player) => {
              const selected = selectedPastInvitedUserIds.has(player.userId);
              const blocked = !player.canInvite;
              const playerOption = (
                <button
                  key={player.userId}
                  type="button"
                  className={`participantOption participantOption--invited${
                    selected ? " participantOption--active" : ""
                  }${blocked ? " participantOption--blocked" : ""}`}
                  disabled={blocked}
                  aria-pressed={selected}
                  onClick={() => togglePastInvitedPlayer(player.userId)}
                >
                  <span
                    className="participantOption__avatar"
                    style={avatarStyleFor(player.avatarColor)}
                  >
                    {getInitials(player.name)}
                  </span>
                  <span className="participantOption__copy">
                    <span className="participantOption__nameRow">
                      <span className="participantOption__name">
                        {player.name}
                      </span>
                      <span className="participantOption__badge">
                        <Link size={9} strokeWidth={2.7} aria-hidden="true" />
                        {translate("copy.invitedBefore")}</span>
                    </span>
                  </span>
                  {blocked ? (
                    <LockKeyhole
                      className="participantOption__blockedIcon"
                      size={16}
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  ) : (
                    <SelectionStateIcon selected={selected} />
                  )}
                </button>
              );

              return blocked ? (
                <div
                  key={player.userId}
                  className="participantOptionGroup participantOptionGroup--blocked"
                >
                  {playerOption}
                  <div className="participantOption__codeFooter">
                    <LockKeyhole
                      size={14}
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{translate("copy.inviteCodeRequired")}</strong>
                      {translate("copy.playerHasAutomaticInvitesOffToAddThemShareTheGameCode")}
                    </span>
                  </div>
                </div>
              ) : (
                playerOption
              );
            })}
            {filteredStagedPlayers.map((player) => {
              const selected = selectedStagedPlayerIds.has(player.id);
              return (
                <SwipeableCard
                  key={player.id}
                  actionWidth={68}
                  rowClassName="participantOptionSwipe swipeRow--dropletDelete"
                  cardClassName={`participantOption participantOption--swipe${
                    selected ? " participantOption--active" : ""
                  }`}
                  renderActions={({ closeSwipe }) => (
                    <button
                      className="swipeDelete"
                      type="button"
                      onClick={() => {
                        closeSwipe();
                        deleteStagedPlayer(player.id);
                      }}
                      aria-label={translate("dynamic.deleteLocalPlayer", [player.name])}
                    >
                      <Trash2 size={18} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  )}
                >
                  {() => (
                    <button
                      className="participantOption__button"
                      type="button"
                      onClick={() => toggleStagedPlayer(player.id)}
                    >
                      <span
                        className="participantOption__avatar"
                        style={avatarStyleFor(player.avatarColor)}
                      >
                        {getInitials(player.name)}
                      </span>
                      <span className="participantOption__copy">
                        <span className="participantOption__nameRow">
                          <span className="participantOption__name">
                            {formatPlayerName(player.name)}
                          </span>
                          <span className="participantOption__badge">
                            {translate("copy.local")}
                          </span>
                        </span>
                      </span>
                      <SelectionStateIcon selected={selected} />
                    </button>
                  )}
                </SwipeableCard>
              );
            })}
            {filteredProfiles
              .filter((profile) => !profile.isAccountPlayer)
              .map(renderSavedProfile)}
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
