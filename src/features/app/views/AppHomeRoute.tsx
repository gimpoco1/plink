import { translate } from "../../../i18n/translate";
import { motion } from "framer-motion";
import { DashboardScreen } from "../../../screens/DashboardScreen";
import { useAppContext } from "../context/AppContext";

export function AppHomeRoute() {
  const {
    authDialogRef,
    canViewSavedData,
    cancelGameStartSplash,
    chooseReplayInvitedUserIds,
    confirmRef,
    createTeam,
    deleteGame,
    deleteProfile,
    deleteSavedTeam,
    dismissLocalSessionsHint,
    duplicateGame,
    entitlements,
    games,
    guardSessionCreation,
    handleCreateGame,
    handleStartQuickSetup,
    handleStoreNewGameDraft,
    handleTeamCreatedFromDashboard,
    homeTab,
    openProFeatureAuthPrompt,
    openTeamBuilderRequestToken,
    pendingLocalProfilesCount,
    pendingLocalSessionsCount,
    pastInvitedPlayers,
    presetDraft,
    presetDraftIntent,
    presetDraftToken,
    profiles,
    joinGameByCode,
    reduceMotion,
    removeProfileMemberships,
    renameGame,
    selectGame,
    setGameReturnTab,
    setHomeTab,
    setOpenTeamBuilderRequestToken,
    setShouldSaveGamePlayersOnSignIn,
    setView,
    showLocalSessionsHint,
    showToast,
    teams,
    triggerGameStartSplash,
    toggleTeamMember,
    updateProfileEverywhere,
    updateTeam,
    upsertProfile,
    visibleGames,
    visibleProfiles,
    visibleTeamMembers,
    visibleTeams,
  } = useAppContext();
  return (
    <motion.div
      className="appView"
      key="view-home"
      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? {} : { opacity: 0, y: -14, scale: 0.995 }}
      transition={{
        duration: reduceMotion ? 0 : 0.24,
        ease: "easeOut",
      }}
    >
      <DashboardScreen
        games={visibleGames}
        profiles={visibleProfiles}
        pastInvitedPlayers={pastInvitedPlayers}
        teams={visibleTeams}
        teamMembers={visibleTeamMembers}
        canUseTeams={entitlements.canUseTeams}
        isAuthenticated={canViewSavedData}
        showLocalSessionsHint={showLocalSessionsHint}
        pendingLocalSessionsCount={pendingLocalSessionsCount}
        pendingLocalProfilesCount={pendingLocalProfilesCount}
        onDismissLocalSessionsHint={dismissLocalSessionsHint}
        presetDraft={presetDraft}
        presetDraftToken={presetDraftToken}
        presetDraftIntent={presetDraftIntent}
        openTeamBuilderRequestToken={openTeamBuilderRequestToken}
        onOpenTeamBuilderRequestHandled={() =>
          setOpenTeamBuilderRequestToken(0)
        }
        onOpenAuth={() => {
          setShouldSaveGamePlayersOnSignIn(false);
          authDialogRef.current?.open();
        }}
        onOpenProFeatureAuth={openProFeatureAuthPrompt}
        onOpenLocalImport={() => {
          setShouldSaveGamePlayersOnSignIn(false);
          authDialogRef.current?.openLocalImport();
        }}
        onOpenProPlan={() => {
          setShouldSaveGamePlayersOnSignIn(false);
          authDialogRef.current?.openPlan();
        }}
        activeTab={homeTab}
        onActiveTabChange={setHomeTab}
        onStoreNewGameDraft={handleStoreNewGameDraft}
        onCreate={handleCreateGame}
        onStartQuickSetup={handleStartQuickSetup}
        onUpsertProfile={upsertProfile}
        onJoinGame={async (code) => {
          const joinedGame = await joinGameByCode(code);
          selectGame(joinedGame.id);
          setGameReturnTab(homeTab);
          setView("game");
        }}
        onUpdateProfile={(id, updates) => {
          updateProfileEverywhere(id, updates);
        }}
        onDeleteProfile={async (profileId) => {
          const profile = profiles.find((p) => p.id === profileId);
          if (profile?.isAccountPlayer) {
            showToast(translate("copy.yourAccountPlayerCannotBeDeleted"));
            return;
          }
          const ok = await confirmRef.current?.confirm({
            title: translate("copy.deleteSavedPlayer"),
            message: translate("dynamic.deleteTheyWillBeRemovedFromYourList", [
              profile?.name || translate("common.thisPlayer"),
            ]),
            confirmText: translate("copy.delete"),
            tone: "danger",
          });
          if (ok) {
            removeProfileMemberships(profileId);
            deleteProfile(profileId);
          }
        }}
        onCreateTeam={(name, icon) => createTeam(name, icon)}
        onTeamCreated={handleTeamCreatedFromDashboard}
        onUpdateTeam={updateTeam}
        onDeleteTeam={async (teamId) => {
          const team = teams.find((item) => item.id === teamId);
          const ok = await confirmRef.current?.confirm({
            title: translate("copy.deleteTeam"),
            message: translate("dynamic.deleteThisRemovesTheTeamOnlySavedPlayersWillStayInYour", [
              team?.name ?? translate("common.thisTeam"),
            ]),
            confirmText: translate("copy.delete"),
            tone: "danger",
          });
          if (ok) deleteSavedTeam(teamId);
        }}
        onToggleTeamMember={(teamId, profileId) => {
          toggleTeamMember(teamId, profileId);
        }}
        onDuplicate={async (gameId) => {
          if (!guardSessionCreation()) {
            return;
          }
          const game = games.find((item) => item.id === gameId);
          if (!game) return;
          const invitedUserIds = await chooseReplayInvitedUserIds(game);
          if (invitedUserIds === null) return;
          triggerGameStartSplash();
          const duplicated = await duplicateGame(
            gameId,
            profiles,
            invitedUserIds,
          );
          if (duplicated) {
            setGameReturnTab(homeTab);
            setView("game");
          } else {
            cancelGameStartSplash();
          }
        }}
        onRename={async (gameId) => {
          const g = games.find((x) => x.id === gameId);
          if (!g) return;
          const nextName = await confirmRef.current?.prompt({
            title: translate("copy.renameSession"),
            message:
              translate("copy.chooseAClearNameSoThisSessionIsEasyToFindLater"),
            initialValue: g.name,
            placeholder: translate("copy.sessionName"),
            confirmText: translate("copy.saveName"),
            maxLength: 28,
          });
          if (nextName) {
            await renameGame(gameId, nextName);
          }
        }}
        onEnter={(gameId) => {
          selectGame(gameId);
          setGameReturnTab(homeTab);
          setView("game");
        }}
        onDelete={async (gameId) => {
          const g = games.find((x) => x.id === gameId);
          const label = g ? g.name : translate("common.thisGame");
          const ok = await confirmRef.current?.confirm({
            title: translate("copy.deleteGame"),
            message: translate("dynamic.deleteThisRemovesTheGameAndItsScores", [label]),
            confirmText: translate("copy.delete"),
            tone: "danger",
          });
          if (!ok) return;
          await deleteGame(gameId);
        }}
      />
    </motion.div>
  );
}
