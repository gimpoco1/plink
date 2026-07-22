import { motion } from "framer-motion";
import { DashboardScreen } from "../../../screens/DashboardScreen";
import { useAppContext } from "../context/AppContext";

export function AppHomeRoute() {
  const {
    authDialogRef,
    canViewSavedData,
    cancelGameStartSplash,
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
            showToast("Your account player cannot be deleted.");
            return;
          }
          const ok = await confirmRef.current?.confirm({
            title: "Delete saved player",
            message: `Delete "${profile?.name || "this player"}"? They will be removed from your list.`,
            confirmText: "Delete",
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
            title: "Delete team",
            message: `Delete "${team?.name ?? "this team"}"? This removes the team only. Saved players will stay in your roster.`,
            confirmText: "Delete",
            tone: "danger",
          });
          if (ok) deleteSavedTeam(teamId);
        }}
        onToggleTeamMember={(teamId, profileId) => {
          toggleTeamMember(teamId, profileId);
        }}
        onDuplicate={(gameId) => {
          if (!guardSessionCreation()) {
            return;
          }
          triggerGameStartSplash();
          const duplicated = duplicateGame(gameId);
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
            title: "Rename session",
            message:
              "Choose a clear name so this session is easy to find later.",
            initialValue: g.name,
            placeholder: "Session name",
            confirmText: "Save name",
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
          const label = g ? g.name : "this game";
          const ok = await confirmRef.current?.confirm({
            title: "Delete game",
            message: `Delete "${label}"? This removes the game and its scores.`,
            confirmText: "Delete",
            tone: "danger",
          });
          if (!ok) return;
          await deleteGame(gameId);
        }}
      />
    </motion.div>
  );
}
