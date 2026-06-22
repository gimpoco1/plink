import { useMemo, useRef, useState } from "react";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "./components/ConfirmDialog";
import { TopBar } from "./components/TopBar/TopBar";
import { useProfiles } from "./hooks/useProfiles";
import { useGames } from "./hooks/useGames";
import { useScorePulse } from "./hooks/useScorePulse";
import { HomeScreen } from "./screens/HomeScreen";
import { GameScreen } from "./screens/GameScreen";
import { AddPlayerDialogHandle } from "./components/AddPlayerDialog/AddPlayerDialog";
import {
  GameSettingsDialog,
  GameSettingsDialogHandle,
} from "./components/GameSettingsDialog/GameSettingsDialog";
import DotGrid from "./styles/components/DotGrid";
import { getGameDisplayName } from "./utils/text";
import { findWinner } from "./utils/ranking";
import {
  computeProfileStats,
  createEmptyProfileStats,
} from "./utils/profileStats";

export default function App() {
  const { profiles, upsertProfile, deleteProfile, updateProfile } =
    useProfiles();
  const {
    games,
    currentGame,
    createGame,
    duplicateGame,
    selectGame,
    deleteGame,
    renameGame,
    addPlayer,
    removePlayer,
    resetScores,
    updateScore,
    updateGameSettings,
    syncProfile,
  } = useGames();
  const { pulseById, triggerPulse } = useScorePulse();
  const confirmRef = useRef<ConfirmDialogHandle>(null!);
  const addDialogRef = useRef<AddPlayerDialogHandle>(null!);
  const settingsDialogRef = useRef<GameSettingsDialogHandle>(null!);
  const [view, setView] = useState<"home" | "game">("home");
  const profileStats = useMemo(() => computeProfileStats(games), [games]);

  const gameMetaItems = useMemo(() => {
    if (!currentGame) return [];

    const items: Array<{ label: string; tone?: "accent" | "muted" }> = [];
    const winner = findWinner(
      currentGame.players,
      currentGame.targetPoints,
      currentGame.isLowScoreWins,
    );

    if (winner) {
      items.push({ label: `Winner ${winner.name}`, tone: "accent" });
    }

    items.push({
      label: currentGame.isLowScoreWins
        ? `Lowest wins · ${currentGame.targetPoints}`
        : `Target ${currentGame.targetPoints} pts`,
      tone: "accent",
    });

    if (currentGame.timerEnabled) {
      items.push({ label: "Timer on", tone: "muted" });
    }

    return items;
  }, [currentGame]);

  const gameDisplayName = useMemo(() => {
    if (!currentGame) return { title: "", replayNumber: null };
    return getGameDisplayName(currentGame.name);
  }, [currentGame]);

  const hasNonZeroScore = useMemo(() => {
    if (!currentGame) return false;
    return currentGame.players.some((p) => p.score !== 0);
  }, [currentGame]);

  const currentWinnerStats = useMemo(() => {
    if (!currentGame) return null;
    const winner = findWinner(
      currentGame.players,
      currentGame.targetPoints,
      currentGame.isLowScoreWins,
    );
    if (!winner?.profileId) return null;
    return profileStats.get(winner.profileId) ?? createEmptyProfileStats();
  }, [currentGame, profileStats]);

  return (
    <div className="app">
      <div className="appBackdrop" aria-hidden="true">
        <DotGrid
          dotSize={3}
          gap={23}
          baseColor="#202b34"
          activeColor="#d8ff4f"
          proximity={140}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
          idleSpeed={1.75}
          idleStrength={4.5}
        />
      </div>
      <TopBar
        title={view === "game" && currentGame ? gameDisplayName.title : ""}
        titleSuffix={
          view === "game" && currentGame && gameDisplayName.replayNumber
            ? `#${gameDisplayName.replayNumber}`
            : undefined
        }
        showBackButton={view === "game" && !!currentGame}
        showActionMenu={view === "game" && !!currentGame}
        metaItems={view === "game" && currentGame ? gameMetaItems : undefined}
        showReset={view === "game" && hasNonZeroScore}
        onBack={() => setView("home")}
        onLogoClick={() => setView("home")}
        onAddPlayer={() => addDialogRef.current?.open()}
        onOpenSettings={
          view === "game" && currentGame
            ? () => settingsDialogRef.current?.open()
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

      {view === "game" && currentGame ? (
        <GameScreen
          game={currentGame}
          profiles={profiles}
          confirmRef={confirmRef}
          pulseById={pulseById}
          onTriggerPulse={triggerPulse}
          addDialogRef={addDialogRef}
          onDeleteProfile={async (profileId) => {
            const profile = profiles.find((p) => p.id === profileId);
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
          onStartGame={(profileIds, newPlayers) => {
            if (!currentGame) return;

            // 1. Add players from existing profiles
            profileIds.forEach((pid) => {
              const profile = profiles.find((p) => p.id === pid);
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
              if (np.saveForLater) {
                const profile = upsertProfile(np.name, np.avatarColor);
                if (profile) {
                  addPlayer(currentGame.id, {
                    name: profile.name,
                    avatarColor: profile.avatarColor,
                    profileId: profile.id,
                  });
                }
              } else {
                addPlayer(currentGame.id, {
                  name: np.name,
                  avatarColor: np.avatarColor,
                });
              }
            });
          }}
          onUpdateScore={(playerId, delta) =>
            updateScore(currentGame.id, playerId, delta)
          }
          onDeletePlayer={(playerId) => removePlayer(currentGame.id, playerId)}
          winnerStats={currentWinnerStats}
          onReplayGame={() => {
            const duplicated = duplicateGame(currentGame.id);
            if (duplicated) setView("game");
          }}
          onBackToHome={() => setView("home")}
        />
      ) : (
        <HomeScreen
          games={games}
          profiles={profiles}
          onCreate={(input) => {
            const created = createGame(input);
            if (created) setView("game");
          }}
          onUpsertProfile={upsertProfile}
          onUpdateProfile={(id, updates) => {
            updateProfile(id, updates);
            syncProfile(id, updates);
          }}
          onDeleteProfile={async (profileId) => {
            const profile = profiles.find((p) => p.id === profileId);
            const ok = await confirmRef.current?.confirm({
              title: "Delete saved player",
              message: `Delete "${profile?.name || "this player"}"? They will be removed from your list.`,
              confirmText: "Delete",
              tone: "danger",
            });
            if (ok) deleteProfile(profileId);
          }}
          onDuplicate={(gameId) => {
            const duplicated = duplicateGame(gameId);
            if (duplicated) setView("game");
          }}
          onRename={(gameId) => {
            const g = games.find((x) => x.id === gameId);
            if (!g) return;
            const nextName = window.prompt("Rename game", g.name);
            if (nextName !== null) {
              renameGame(gameId, nextName);
            }
          }}
          onEnter={(gameId) => {
            selectGame(gameId);
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
            deleteGame(gameId);
          }}
        />
      )}

      {view === "game" && currentGame ? (
        <GameSettingsDialog
          ref={settingsDialogRef}
          game={currentGame}
          onSave={(input) => {
            updateGameSettings(currentGame.id, input);
          }}
        />
      ) : null}

      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}
