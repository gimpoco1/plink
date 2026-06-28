import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, Player } from "../types";
import type { PlayerProfile } from "../types";
import { capitalizeFirst, getGameDisplayName, getInitials } from "../utils/text";
import { computeRanks, findWinner, sortPlayers } from "../utils/ranking";
import { WinCelebration } from "../components/WinCelebration/WinCelebration";
import { useDelayedRanking } from "../hooks/useDelayedRanking";
import {
  ManagePlayersDialog,
  ManagePlayersDialogHandle,
} from "../components/ManagePlayersDialog/ManagePlayersDialog";
import { PlayerCard } from "../components/PlayerCard/PlayerCard";
import { GameTimer } from "../components/GameTimer/GameTimer";
import type { ProfileStats } from "../utils/profileStats";
import "./GameScreen.css";

type Props = {
  game: Game;
  profiles: PlayerProfile[];
  isAuthenticated: boolean;
  managePlayersDialogRef: React.RefObject<ManagePlayersDialogHandle>;
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
  onDeletePlayer: (playerId: string) => Promise<void> | void;
  onUpdatePlayer: (
    playerId: string,
    updates: Partial<Pick<Player, "name" | "avatarColor" | "profileId">>,
  ) => void;
  winnerStats: ProfileStats | null;
  onReplayGame: () => void;
  onBackToHome: () => void;
};

export function GameScreen({
  game,
  profiles,
  isAuthenticated,
  managePlayersDialogRef,
  pulseById,
  onTriggerPulse,
  onDeleteProfile,
  onStartGame,
  onUpdateScore,
  onDeletePlayer,
  onUpdatePlayer,
  winnerStats,
  onReplayGame,
  onBackToHome,
}: Props) {
  const takenProfileIds = useMemo(
    () =>
      new Set(game.players.map((p) => p.profileId).filter(Boolean) as string[]),
    [game.players],
  );

  const hasPlayers = game.players.length > 0;
  const [winFxName, setWinFxName] = useState<string | null>(null);
  const [dismissedWinnerId, setDismissedWinnerId] = useState<string | null>(null);
  const [lastScoreAction, setLastScoreAction] = useState<{
    playerId: string;
    playerName: string;
    delta: number;
  } | null>(null);
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

  const gameDisplayName = useMemo(() => getGameDisplayName(game.name), [game.name]);

  const finalStandings = useMemo(() => {
    const sorted = [...game.players].sort((a, b) =>
      sortPlayers(a, b, game.isLowScoreWins),
    );
    const ranksMap = computeRanks(sorted);
    return sorted.map((player) => ({
      player,
      rank: ranksMap.get(player.id) ?? 1,
      isWinner: winner?.id === player.id,
    }));
  }, [game.players, game.isLowScoreWins, winner?.id]);

  const showWinSummary = !!winner && dismissedWinnerId !== winner.id;

  useEffect(() => {
    const winnerId = winner?.id ?? null;
    if (winnerId && prevWinnerIdRef.current !== winnerId) {
      setWinFxName(capitalizeFirst(winner?.name ?? ""));
      setDismissedWinnerId(null);
    }
    prevWinnerIdRef.current = winnerId;
  }, [winner]);

  useEffect(() => {
    if (!lastScoreAction) return;
    const timeout = window.setTimeout(() => setLastScoreAction(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [lastScoreAction]);

  useEffect(() => setLastScoreAction(null), [game.id]);
  useEffect(() => setDismissedWinnerId(null), [game.id]);

  return (
    <>
      {showWinSummary && winFxName ? (
        <WinCelebration
          winnerName={winFxName}
          gameName={gameDisplayName.title}
          targetPoints={game.targetPoints}
          isLowScoreWins={game.isLowScoreWins}
          winnerStats={winnerStats}
          standings={finalStandings.map(({ player, rank, isWinner }) => ({
            id: player.id,
            name: capitalizeFirst(player.name),
            initials: getInitials(player.name),
            avatarColor: player.avatarColor,
            score: player.score,
            rank,
            isWinner,
          }))}
          onDismiss={() => {
            setDismissedWinnerId(winner?.id ?? null);
            setWinFxName(null);
          }}
          onReplay={() => {
            setDismissedWinnerId(winner?.id ?? null);
            setWinFxName(null);
            onReplayGame();
          }}
          onBackToHome={() => {
            setDismissedWinnerId(winner?.id ?? null);
            setWinFxName(null);
            onBackToHome();
          }}
        />
      ) : null}
      <main className={`content${game.timerEnabled ? " content--hasTimer" : ""}`}>
        {!hasPlayers ? (
          <section className="empty">
            <h1 className="empty__title">Manage players to start.</h1>
            <button
              className="btn btn--primary btn--xl"
              type="button"
              onClick={() => managePlayersDialogRef.current?.open()}
            >
              Manage players
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
                    setLastScoreAction({
                      playerId,
                      playerName: capitalizeFirst(player.name),
                      delta,
                    });
                  }}
                  onDelete={(playerId) => void onDeletePlayer(playerId)}
                />
              );
            })}
          </section>
        )}
      </main>

      {lastScoreAction ? (
        <div
          className={`scoreUndo${game.timerEnabled ? " scoreUndo--withTimer" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>
            <strong>
              {lastScoreAction.delta > 0 ? "+" : ""}
              {lastScoreAction.delta}
            </strong>
            {" to "}
            {lastScoreAction.playerName}
          </span>
          <button
            type="button"
            onClick={() => {
              onUpdateScore(lastScoreAction.playerId, -lastScoreAction.delta);
              onTriggerPulse(lastScoreAction.playerId, -lastScoreAction.delta);
              scheduleResort();
              setLastScoreAction(null);
            }}
          >
            Undo
          </button>
        </div>
      ) : null}

      {game.timerEnabled ? (
        <GameTimer
          key={`${game.id}:${game.timerMode}:${game.timerSeconds}`}
          gameId={game.id}
          mode={game.timerMode}
          durationSeconds={game.timerSeconds}
        />
      ) : null}

      <ManagePlayersDialog
        ref={managePlayersDialogRef}
        profiles={profiles}
        currentPlayers={game.players}
        takenProfileIds={takenProfileIds}
        isAuthenticated={isAuthenticated}
        onDeleteProfile={(profileId) => onDeleteProfile(profileId)}
        onDeletePlayer={onDeletePlayer}
        onUpdatePlayer={onUpdatePlayer}
        onStartGame={onStartGame}
      />
    </>
  );
}
