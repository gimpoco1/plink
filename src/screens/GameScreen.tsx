import { useEffect, useMemo, useRef, useState } from "react";
import type { Game } from "../types";
import type { ConfirmDialogHandle } from "../components/ConfirmDialog";
import type { PlayerProfile } from "../types";
import { capitalizeFirst } from "../utils/text";
import { findWinner } from "../utils/ranking";
import { WinCelebration } from "../components/WinCelebration/WinCelebration";
import { useDelayedRanking } from "../hooks/useDelayedRanking";
import {
  AddPlayerDialog,
  AddPlayerDialogHandle,
} from "../components/AddPlayerDialog/AddPlayerDialog";
import { PlayerCard } from "../components/PlayerCard/PlayerCard";
import { GameTimer } from "../components/GameTimer/GameTimer";

type Props = {
  game: Game;
  profiles: PlayerProfile[];
  confirmRef: React.RefObject<ConfirmDialogHandle>;
  addDialogRef: React.RefObject<AddPlayerDialogHandle>;
  pulseById: Record<string, "pos" | "neg" | undefined>;
  onTriggerPulse: (playerId: string, delta: number) => void;
  onDeleteProfile: (profileId: string) => void;
  onStartGame: (
    profileIds: string[],
    newPlayers: Array<{
      name: string;
      avatarColor: string;
      saveForLater: boolean;
    }>,
  ) => void;
  onUpdateScore: (playerId: string, delta: number) => void;
  onDeletePlayer: (playerId: string) => void;
};

export function GameScreen({
  game,
  profiles,
  confirmRef,
  addDialogRef,
  pulseById,
  onTriggerPulse,
  onDeleteProfile,
  onStartGame,
  onUpdateScore,
  onDeletePlayer,
}: Props) {
  const takenProfileIds = useMemo(
    () =>
      new Set(game.players.map((p) => p.profileId).filter(Boolean) as string[]),
    [game.players],
  );

  const hasPlayers = game.players.length > 0;
  const [winFxName, setWinFxName] = useState<string | null>(null);
  const prevWinnerIdRef = useRef<string | null>(null);
  const { orderedPlayers, ranks, scheduleResort } = useDelayedRanking(
    game.players,
    1200,
    game.isLowScoreWins,
  );
  const allZero = useMemo(
    () => game.players.length > 0 && game.players.every((p) => p.score === 0),
    [game.players],
  );

  const winner = useMemo(() => {
    return findWinner(game.players, game.targetPoints, game.isLowScoreWins);
  }, [game.players, game.targetPoints, game.isLowScoreWins]);

  useEffect(() => {
    const winnerId = winner?.id ?? null;
    if (winnerId && prevWinnerIdRef.current !== winnerId) {
      setWinFxName(capitalizeFirst(winner?.name ?? ""));
    }
    prevWinnerIdRef.current = winnerId;
  }, [winner]);

  return (
    <>
      {winFxName ? (
        <WinCelebration
          winnerName={winFxName}
          onDone={() => setWinFxName(null)}
        />
      ) : null}
      <main className={`content${game.timerEnabled ? " content--hasTimer" : ""}`}>
        {!hasPlayers ? (
          <section className="empty">
            <h1 className="empty__title">Add players to start.</h1>
            <button
              className="btn btn--primary btn--xl"
              type="button"
              onClick={() => addDialogRef.current?.open()}
            >
              Add first player
            </button>
          </section>
        ) : (
          <section className="grid" aria-label="Players">
            {orderedPlayers.map((player) => {
              const rank = ranks.get(player.id) ?? 1;
              const pulse = pulseById[player.id];
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  rank={rank}
                  showRank={!allZero}
                  pulse={pulse}
                  isWinner={winner?.id === player.id}
                  targetPoints={game.targetPoints}
                  onDelta={(playerId, delta) => {
                    onUpdateScore(playerId, delta);
                    onTriggerPulse(playerId, delta);
                    scheduleResort();
                  }}
                  onDelete={async (playerId) => {
                    const p = game.players.find((x) => x.id === playerId);
                    const label = p ? capitalizeFirst(p.name) : "this player";
                    const ok = await confirmRef.current?.confirm({
                      title: "Remove player",
                      message: `Do you want to remove ${label} from this game?`,
                      confirmText: "Remove",
                      tone: "danger",
                    });
                    if (!ok) return;
                    onDeletePlayer(playerId);
                  }}
                />
              );
            })}
          </section>
        )}
      </main>

      {game.timerEnabled ? (
        <GameTimer
          gameId={game.id}
          mode={game.timerMode}
          durationSeconds={game.timerSeconds}
        />
      ) : null}

      <AddPlayerDialog
        ref={addDialogRef}
        profiles={profiles}
        takenProfileIds={takenProfileIds}
        onDeleteProfile={(profileId) => onDeleteProfile(profileId)}
        onStartGame={onStartGame}
      />
    </>
  );
}
