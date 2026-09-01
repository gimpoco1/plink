import { translate } from "../../../i18n/translate";
import { motion } from "framer-motion";
import { GameScreen } from "../../../screens/GameScreen";
import { capitalizeFirst } from "../../../utils/text";
import { isGameComplete } from "../../../utils/ranking";
import { useAppContext } from "../context/AppContext";

export function AppGameRoute() {
  const {
    addPlayer,
    addPastLinkedPlayer,
    addTeam,
    canViewSavedData,
    cancelGameStartSplash,
    chooseReplayInvitedUserIds,
    combinedGuestAndLocalProfiles,
    confirmRef,
    currentGame,
    currentGameIsLatestCompleted,
    currentWinnerStats,
    deleteProfile,
    deleteSavedTeam,
    duplicateGame,
    entitlements,
    gameScreenProfiles,
    guardSessionCreation,
    handleEndCurrentGame,
    managePlayersDialogRef,
    openTeamsTabFromGame,
    profiles,
    pastLinkedPlayers,
    pulseById,
    reduceMotion,
    removePlayer,
    mergePlayers,
    removeTeam,
    returnToGameSource,
    setView,
    setSharingOpen,
    showToast,
    triggerPulse,
    triggerGameStartSplash,
    updatePlayer,
    updateProfile,
    updateProfileEverywhere,
    updateScore,
    upsertLocalStoredPlayer,
    upsertProfile,
    visibleTeamMembers,
    visibleTeams,
  } = useAppContext();
  if (!currentGame) return null;
  return (
    <motion.div
      className="appView"
      key={`view-game-${currentGame.id}`}
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? {} : { opacity: 0, y: -16, scale: 0.995 }}
      transition={{
        duration: reduceMotion ? 0 : 0.26,
        ease: "easeOut",
      }}
    >
      <GameScreen
        game={currentGame}
        profiles={gameScreenProfiles}
        teams={visibleTeams}
        teamMembers={visibleTeamMembers}
        isAuthenticated={canViewSavedData}
        canUseTeams={entitlements.canUseTeams}
        canManageGame={currentGame.accessRole !== "collaborator"}
        canManageLifecycle={
          currentGame.accessRole !== "collaborator" ||
          currentGame.collaboratorsCanManage
        }
        pulseById={pulseById}
        onTriggerPulse={triggerPulse}
        managePlayersDialogRef={managePlayersDialogRef}
        onDeleteProfile={async (profileId) => {
          const profile = profiles.find((p) => p.id === profileId);
          if (profile?.isAccountPlayer) {
            showToast(translate("copy.yourAccountPlayerCannotBeDeleted"));
            return;
          }
          const label = profile
            ? profile.name
            : translate("common.thisPlayer");
          const ok = await confirmRef.current?.confirm({
            title: translate("copy.deleteSavedPlayer"),
            message: translate("dynamic.deleteFromYourSavedPlayers", [label]),
            confirmText: translate("copy.delete"),
            tone: "danger",
          });
          if (!ok) return;
          deleteProfile(profileId);
        }}
        onUpsertProfile={upsertProfile}
        onUpsertLocalPlayer={(name, avatarColor) => {
          const localPlayer = upsertLocalStoredPlayer(name, avatarColor);
          return localPlayer
            ? {
                id: localPlayer.id,
                name: localPlayer.name,
                avatarColor: localPlayer.avatarColor,
                createdAt: localPlayer.createdAt,
                updatedAt: localPlayer.updatedAt,
              }
            : null;
        }}
        onStartGame={(profileIds, newPlayers) => {
          if (!currentGame) return;
          const availableProfiles = canViewSavedData
            ? profiles
            : combinedGuestAndLocalProfiles;

          // 1. Add players from existing profiles
          profileIds.forEach((pid) => {
            const profile = availableProfiles.find((p) => p.id === pid);
            if (profile) {
              addPlayer(currentGame.id, {
                name: profile.name,
                avatarColor: profile.avatarColor,
                profileId: profile.id,
              });
            }
          });

          // 2. Add newly created players
          newPlayers.forEach((np) => {
            if (np.saveForLater && canViewSavedData) {
              const profile = upsertProfile(np.name, np.avatarColor);
              if (profile) {
                addPlayer(currentGame.id, {
                  name: profile.name,
                  avatarColor: profile.avatarColor,
                  profileId: profile.id,
                });
              }
            } else {
              const localPlayer = upsertLocalStoredPlayer(
                np.name,
                np.avatarColor,
              );
              addPlayer(currentGame.id, {
                name: localPlayer?.name ?? np.name,
                avatarColor: localPlayer?.avatarColor ?? np.avatarColor,
                profileId: localPlayer?.id,
              });
            }
          });
        }}
        onUpdateScore={async (playerId, delta) => {
          if (isGameComplete(currentGame)) {
            const confirmed = await confirmRef.current?.confirm({
              eyebrow: translate("copy.gameFinished"),
              title: translate("copy.changeThisScore"),
              message:
                translate("copy.changingTheScoreWillAlsoUpdateThisGameSResultAndStats"),
              confirmText: translate("copy.updateScore"),
              cancelText: translate("copy.cancel"),
            });
            if (!confirmed) return false;
          }

          return updateScore(currentGame.id, playerId, delta);
        }}
        onDeletePlayer={async (playerId) => {
          const player = currentGame.players.find(
            (item) => item.id === playerId,
          );
          const label = player
            ? capitalizeFirst(player.name)
            : translate("common.thisPlayer");
          const ok = await confirmRef.current?.confirm({
            title: translate("copy.removePlayer"),
            message: translate("dynamic.doYouWantToRemoveFromThisGame", [label]),
            confirmText: translate("copy.remove"),
            tone: "danger",
          });
          if (!ok) return;
          await removePlayer(currentGame.id, playerId);
        }}
        pastLinkedPlayers={pastLinkedPlayers}
        onAddPastLinkedPlayer={async (collaboratorUserId) => {
          return addPastLinkedPlayer(currentGame.id, collaboratorUserId);
        }}
        onMergePlayers={async (linkedPlayerId, rosterPlayerId) => {
          const linkedPlayer = currentGame.players.find(
            (player) => player.id === linkedPlayerId,
          );
          const rosterPlayer = currentGame.players.find(
            (player) => player.id === rosterPlayerId,
          );
          const rosterProfile = profiles.find(
            (profile) => profile.id === rosterPlayer?.profileId,
          );
          if (!linkedPlayer || !rosterPlayer || !rosterProfile) return;
          const keepPlayer = await confirmRef.current?.selectPlayer({
            eyebrow: translate("copy.mergeDuplicate"),
            title: translate("copy.whichPlayerShouldStay"),
            message: translate("copy.scoresWillBeCombined"),
            messageCase: "normal",
            layout: "feature",
            players: [
              {
                id: "local",
                name: rosterProfile.isAccountPlayer
                  ? `${capitalizeFirst(rosterPlayer.name)} (You)`
                  : capitalizeFirst(rosterPlayer.name),
                avatarColor: rosterPlayer.avatarColor,
                label: rosterProfile.isAccountPlayer
                  ? translate("copy.accountPlayer2")
                  : translate("copy.savedPlayer"),
                description: translate("copy.invitedPlayerWillBeRemoved"),
              },
              {
                id: "linked",
                name: capitalizeFirst(linkedPlayer.name),
                avatarColor: linkedPlayer.avatarColor,
                label: translate("copy.invitedPlayer"),
                description: translate("copy.staysConnectedToTheirAccount"),
              },
            ],
            confirmText: translate("copy.merge"),
            cancelText: translate("copy.cancel"),
            tone: "default",
          });
          if (keepPlayer !== "local" && keepPlayer !== "linked") return;
          await mergePlayers(
            currentGame.id,
            linkedPlayerId,
            rosterPlayerId,
            keepPlayer,
          );
        }}
        onUpdateProfile={(profileId, updates) => {
          updateProfileEverywhere(profileId, updates);
        }}
        onUpdatePlayer={(playerId, updates) => {
          const player = currentGame.players.find(
            (item) => item.id === playerId,
          );
          const profileId = player?.profileId;
          if (profileId) {
            const profileUpdates: Parameters<typeof updateProfile>[1] = {};
            if (updates.name !== undefined) {
              profileUpdates.name = updates.name;
            }
            if (updates.avatarColor !== undefined) {
              profileUpdates.avatarColor = updates.avatarColor;
            }
            if (Object.keys(profileUpdates).length > 0) {
              updateProfileEverywhere(profileId, profileUpdates);
            }
          }
          const needsDirectGameUpdate =
            !profileId || "profileId" in updates || "teamId" in updates;
          if (needsDirectGameUpdate) {
            void updatePlayer(currentGame.id, playerId, updates);
          }
        }}
        onCreateTeam={(name, icon, members = []) => {
          return addTeam(
            currentGame.id,
            name,
            icon,
            members.map((member) => ({
              name: member.name,
              avatarColor: member.avatarColor,
              profileId: member.id,
            })),
          );
        }}
        onDeleteTeam={async (teamId, teamName) => {
          const ok = await confirmRef.current?.confirm({
            title: translate("copy.removeTeam"),
            message:
              currentGame.participantMode === "teams"
                ? translate("dynamic.removeFromThisGamePlayersInThisTeamWillAlsoBeRemoved", [teamName])
                : translate("dynamic.removeFromThisGamePlayersWillStayInTheGameButBe", [teamName]),
            confirmText: translate("copy.remove"),
            tone: "danger",
          });
          if (!ok) return;
          removeTeam(currentGame.id, teamId);
        }}
        onDeleteSavedTeam={async (teamId, teamName) => {
          const ok = await confirmRef.current?.confirm({
            title: translate("copy.deleteTeam"),
            message: translate("dynamic.deleteThisRemovesTheTeamOnlySavedPlayersWillStayInYour", [teamName]),
            confirmText: translate("copy.delete"),
            tone: "danger",
          });
          if (ok) deleteSavedTeam(teamId);
        }}
        onOpenTeamsTab={openTeamsTabFromGame}
        onInviteOthers={
          canViewSavedData ? () => setSharingOpen(true) : undefined
        }
        winnerStats={currentWinnerStats}
        isLatestCompletedGame={currentGameIsLatestCompleted}
        onReplayGame={async () => {
          if (!guardSessionCreation()) {
            return;
          }
          const invitedUserIds = await chooseReplayInvitedUserIds(currentGame);
          if (invitedUserIds === null) return;
          triggerGameStartSplash();
          const duplicated = await duplicateGame(
            currentGame.id,
            profiles,
            invitedUserIds,
          );
          if (duplicated) {
            setView("game");
          } else {
            cancelGameStartSplash();
          }
        }}
        onBackToHome={returnToGameSource}
        onEndGame={handleEndCurrentGame}
      />
    </motion.div>
  );
}
