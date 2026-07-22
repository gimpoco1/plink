import { motion } from "framer-motion";
import { useState } from "react";
import { CircleUser } from "lucide-react";
import { TopBar } from "../../../components/TopBar/TopBar";
import { GameSharingDialog } from "../../../components/GameSharing/GameSharingDialog";
import { findWinner } from "../../../utils/ranking";
import { useAppContext } from "../context/AppContext";

export function AppTopBar() {
  const {
    authDialogRef,
    authEnabled,
    authLoading,
    createGameInvite,
    confirmRef,
    currentGame,
    gameDisplayName,
    gameMetaItems,
    handleEndCurrentGame,
    hasNonZeroScore,
    homeTab,
    managePlayersDialogRef,
    reduceMotion,
    resetScores,
    returnToGameSource,
    rotateGameInvite,
    session,
    setCollaboratorsCanManage,
    setShouldSaveGamePlayersOnSignIn,
    setView,
    settingsDialogRef,
    view,
  } = useAppContext();
  const [sharingOpen, setSharingOpen] = useState(false);
  const canManageGame = currentGame?.accessRole !== "collaborator";
  const canManageLifecycle =
    canManageGame || currentGame?.collaboratorsCanManage === true;
  return (
    <>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0.85, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
      >
        <TopBar
          accentTone={
            view === "game" &&
            !!currentGame &&
            currentGame.participantMode === "teams"
              ? "team"
              : "default"
          }
          balancedLayout={view === "history"}
          title={
            view === "history" && currentGame
              ? "History"
              : view === "game" && currentGame
                ? gameDisplayName.title
                : ""
          }
          titleSuffix={
            view === "game" && currentGame && gameDisplayName.replayNumber
              ? `#${gameDisplayName.replayNumber}`
              : undefined
          }
          backLabel={view === "history" ? "Back to game" : "Back to games"}
          showBackButton={view !== "home" && !!currentGame}
          showActionMenu={view === "game" && !!currentGame}
          primaryActionLabel={
            view === "home" && homeTab !== "home" && homeTab !== "players"
              ? "New game"
              : undefined
          }
          authLabel={
            view === "home"
              ? authLoading
                ? "Loading..."
                : authEnabled
                  ? session
                    ? undefined
                    : "Sign in"
                  : "Local only"
              : undefined
          }
          authIcon={
            view === "home" && authEnabled && !authLoading && session ? (
              <CircleUser size={26} strokeWidth={2.3} aria-hidden="true" />
            ) : undefined
          }
          authAriaLabel={session ? "Account" : "Sign in"}
          metaItems={
            view === "history" && currentGame
              ? [{ label: gameDisplayName.title, tone: "muted" }]
              : view === "game" && currentGame
                ? gameMetaItems
                : undefined
          }
          showReset={view === "game" && canManageLifecycle && hasNonZeroScore}
          onBack={() =>
            view === "history" ? setView("game") : returnToGameSource()
          }
          onLogoClick={() => setView("home")}
          onPrimaryAction={() => {
            setView("home");
            if (homeTab === "players" && session) {
              window.dispatchEvent(new CustomEvent("plink:add-player"));
            } else {
              window.dispatchEvent(new CustomEvent("plink:new-game"));
            }
          }}
          onOpenAuth={() => {
            setShouldSaveGamePlayersOnSignIn(false);
            authDialogRef.current?.open();
          }}
          onAddPlayerLabel={
            view === "game" && currentGame?.participantMode === "teams"
              ? "Manage teams"
              : "Manage players"
          }
          onAddPlayer={
            canManageGame
              ? () => managePlayersDialogRef.current?.open()
              : undefined
          }
          onShareGame={
            view === "game" &&
            !!currentGame &&
            !!session &&
            currentGame?.participantMode !== "teams"
              ? () => setSharingOpen(true)
              : undefined
          }
          onOpenSettings={
            view === "game" && currentGame && canManageLifecycle
              ? () => settingsDialogRef.current?.open()
              : undefined
          }
          onOpenHistory={
            view === "game" && currentGame
              ? () => setView("history")
              : undefined
          }
          onEndGame={
            view === "game" &&
            canManageLifecycle &&
            currentGame &&
            currentGame.players.length > 0 &&
            !currentGame.endedAt &&
            !findWinner(currentGame.players, currentGame)
              ? handleEndCurrentGame
              : undefined
          }
          onResetGame={
            canManageLifecycle
              ? async () => {
                  if (!currentGame) return;
                  const ok = await confirmRef.current?.confirm({
                    title: "Reset game",
                    message: "Reset all scores to 0?",
                    confirmText: "Reset",
                    tone: "danger",
                  });
                  if (!ok) return;
                  await resetScores(currentGame.id);
                }
              : undefined
          }
        />
      </motion.div>
      {currentGame && session && currentGame.participantMode !== "teams" ? (
        <GameSharingDialog
          open={sharingOpen}
          game={currentGame}
          onClose={() => setSharingOpen(false)}
          onCreateInvite={createGameInvite}
          onRotateInvite={
            currentGame.accessRole !== "collaborator"
              ? rotateGameInvite
              : undefined
          }
          onCollaboratorManagementChange={(enabled) =>
            setCollaboratorsCanManage(currentGame.id, enabled)
          }
        />
      ) : null}
    </>
  );
}
