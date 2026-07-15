import { motion } from "framer-motion";
import { CircleUser } from "lucide-react";
import { TopBar } from "../../../components/TopBar/TopBar";
import { findWinner } from "../../../utils/ranking";
import { useAppContext } from "../context/AppContext";

export function AppTopBar() {
  const {
    authDialogRef,
    authEnabled,
    authLoading,
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
    session,
    setShouldSaveGamePlayersOnSignIn,
    setView,
    settingsDialogRef,
    view,
  } = useAppContext();
  return (
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
        showReset={view === "game" && hasNonZeroScore}
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
        onAddPlayer={() => managePlayersDialogRef.current?.open()}
        onOpenSettings={
          view === "game" && currentGame
            ? () => settingsDialogRef.current?.open()
            : undefined
        }
        onOpenHistory={
          view === "game" && currentGame ? () => setView("history") : undefined
        }
        onEndGame={
          view === "game" &&
          currentGame &&
          currentGame.players.length > 0 &&
          !findWinner(currentGame.players, currentGame)
            ? handleEndCurrentGame
            : undefined
        }
        onResetGame={async () => {
          if (!currentGame) return;
          const ok = await confirmRef.current?.confirm({
            title: "Reset game",
            message: "Reset all scores to 0?",
            confirmText: "Reset",
            tone: "danger",
          });
          if (!ok) return;
          resetScores(currentGame.id);
        }}
      />
    </motion.div>
  );
}
