import { motion } from "framer-motion";
import { GameScreen } from "../../../screens/GameScreen";
import { capitalizeFirst } from "../../../utils/text";
import { isGameComplete } from "../../../utils/ranking";
import {
  getUnsavedReplayPlayers,
  linkedPlayersCarryIntoReplay,
} from "../../../utils/replay";
import { useAppContext } from "../context/AppContext";

export function AppGameRoute() {
  const {
    addPlayer,
    addPastLinkedPlayer,
    addTeam,
    canViewSavedData,
    cancelGameStartSplash,
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
            showToast("Your account player cannot be deleted.");
            return;
          }
          const label = profile ? profile.name : "this player";
          const ok = await confirmRef.current?.confirm({
            title: "Delete saved player",
            message: `Delete "${label}" from your saved players?`,
            confirmText: "Delete",
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
              eyebrow: "Game finished",
              title: "Change this score?",
              message:
                "Changing the score will also update this game's result and stats.",
              confirmText: "Update score",
              cancelText: "Cancel",
            });
            if (!confirmed) return false;
          }

          return updateScore(currentGame.id, playerId, delta);
        }}
        onDeletePlayer={async (playerId) => {
          const player = currentGame.players.find(
            (item) => item.id === playerId,
          );
          const label = player ? capitalizeFirst(player.name) : "this player";
          const ok = await confirmRef.current?.confirm({
            title: "Remove player",
            message: `Do you want to remove ${label} from this game?`,
            confirmText: "Remove",
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
            eyebrow: "Merge duplicate",
            title: "Which player should stay?",
            message:
              "Scores will be combined. Stats count for the player you keep.",
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
                  ? "Account player"
                  : "Saved player",
                description: "Invited player will be removed",
              },
              {
                id: "linked",
                name: capitalizeFirst(linkedPlayer.name),
                avatarColor: linkedPlayer.avatarColor,
                label: "Invited player",
                description: "Stays connected to their account",
              },
            ],
            confirmText: "Merge",
            cancelText: "Cancel",
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
            !profileId ||
            "profileId" in updates ||
            "teamId" in updates;
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
            title: "Remove team",
            message:
              currentGame.participantMode === "teams"
                ? `Remove "${teamName}" from this game? Players in this team will also be removed from this game.`
                : `Remove "${teamName}" from this game? Players will stay in the game but be unassigned from that team.`,
            confirmText: "Remove",
            tone: "danger",
          });
          if (!ok) return;
          removeTeam(currentGame.id, teamId);
        }}
        onDeleteSavedTeam={async (teamId, teamName) => {
          const ok = await confirmRef.current?.confirm({
            title: "Delete team",
            message: `Delete "${teamName}"? This removes the team only. Saved players will stay in your roster.`,
            confirmText: "Delete",
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
          const unsavedPlayers = getUnsavedReplayPlayers(
            currentGame,
            profiles,
          );
          if (unsavedPlayers.length > 0) {
            const linkedPlayersCarryOver = linkedPlayersCarryIntoReplay(
              currentGame,
            );
            const confirmed = await confirmRef.current?.confirm({
              eyebrow: "New game",
              title: "Play again",
              message: linkedPlayersCarryOver
                ? "Invited players will be added automatically. Results for game-only players won’t be added to Stats."
                : "This starts a separate game with the same players. Invited players won’t stay connected, and results for unsaved players won’t be added to Stats.",
              messageCase: "normal",
              playersTitle: linkedPlayersCarryOver
                ? "Game-only players"
                : "Some players aren’t saved",
              players: unsavedPlayers.map((player) => ({
                name: player.name,
                avatarColor: player.avatarColor,
              })),
              confirmText: "Play again",
              cancelText: "Cancel",
              layout: "feature",
              tone: "default",
            });
            if (!confirmed) return;
          }
          triggerGameStartSplash();
          const duplicated = await duplicateGame(currentGame.id, profiles);
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
