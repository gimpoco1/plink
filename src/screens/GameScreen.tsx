import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, Player } from "../types";
import type { PlayerProfile } from "../types";
import {
  capitalizeFirst,
  formatAccountPlayerName,
  getGameDisplayName,
  getInitials,
} from "../utils/text";
import {
  computeRanks,
  findWinner,
  isGameComplete,
  sortPlayers,
} from "../utils/ranking";
import { shouldSortLowToHigh } from "../utils/scoring";
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
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
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
  onEndGame: () => void;
};

export function GameScreen({
  game,
  profiles,
  isAuthenticated,
  managePlayersDialogRef,
  pulseById,
  onTriggerPulse,
  onDeleteProfile,
  onUpsertProfile,
  onStartGame,
  onUpdateScore,
  onDeletePlayer,
  onUpdatePlayer,
  winnerStats,
  onReplayGame,
  onBackToHome,
  onEndGame,
}: Props) {
  const takenProfileIds = useMemo(
    () =>
      new Set(game.players.map((p) => p.profileId).filter(Boolean) as string[]),
    [game.players],
  );
  const accountProfileIds = useMemo(
    () =>
      new Set(
        profiles
          .filter((profile) => profile.isAccountPlayer)
          .map((profile) => profile.id),
      ),
    [profiles],
  );

  function getPlayerDisplayName(player: Player) {
    return player.profileId && accountProfileIds.has(player.profileId)
      ? formatAccountPlayerName(player.name)
      : capitalizeFirst(player.name);
  }

  const hasPlayers = game.players.length > 0;
  const [winFxName, setWinFxName] = useState<string | null>(null);
  const [dismissedOutcomeKey, setDismissedOutcomeKey] = useState<string | null>(null);
  const [lastScoreAction, setLastScoreAction] = useState<{
    playerId: string;
    playerName: string;
    delta: number;
  } | null>(null);
  const prevOutcomeKeyRef = useRef<string | null>(null);
  const lowToHigh = shouldSortLowToHigh(game);
  const { orderedPlayers, ranks, scheduleResort } = useDelayedRanking(
    game.players,
    1200,
    lowToHigh,
  );
  const allZero = useMemo(
    () =>
      game.players.length > 0 &&
      game.players.every((p) => p.score === game.startingScore),
    [game.players, game.startingScore],
  );

  const winner = useMemo(() => {
    return findWinner(game.players, game);
  }, [game]);
  const gameComplete = useMemo(() => isGameComplete(game), [game]);
  const outcomeKey = gameComplete
    ? winner
      ? `winner:${winner.id}:${game.endedAt ?? game.updatedAt}`
      : `draw:${game.endedAt ?? game.updatedAt}`
    : null;

  const gameDisplayName = useMemo(() => getGameDisplayName(game.name), [game.name]);

  const finalStandings = useMemo(() => {
    const sorted = [...game.players].sort((a, b) =>
      sortPlayers(a, b, lowToHigh),
    );
    const ranksMap = computeRanks(sorted);
    return sorted.map((player) => ({
      player,
      rank: ranksMap.get(player.id) ?? 1,
      isWinner: winner?.id === player.id,
    }));
  }, [game.players, lowToHigh, winner?.id]);

  const showWinSummary = !!outcomeKey && dismissedOutcomeKey !== outcomeKey;
  const referenceReached = useMemo(() => {
    if (
      !game.manualEndOnly ||
      gameComplete ||
      game.targetScore <= 0 ||
      !game.players.length
    ) {
      return false;
    }

    if (game.winCondition === "reach_zero" || game.scoreDirection === "down") {
      return game.players.some((player) => player.score <= game.targetScore);
    }

    return game.players.some((player) => player.score >= game.targetScore);
  }, [game, gameComplete]);

  useEffect(() => {
    if (outcomeKey && prevOutcomeKeyRef.current !== outcomeKey) {
      setWinFxName(capitalizeFirst(winner?.name ?? ""));
      setDismissedOutcomeKey(null);
    }
    prevOutcomeKeyRef.current = outcomeKey;
  }, [outcomeKey, winner?.name]);

  useEffect(() => {
    if (!lastScoreAction) return;
    const timeout = window.setTimeout(() => setLastScoreAction(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [lastScoreAction]);

  useEffect(() => setLastScoreAction(null), [game.id]);
  useEffect(() => setDismissedOutcomeKey(null), [game.id]);

  return (
    <>
      {showWinSummary ? (
        <WinCelebration
          winnerName={winFxName}
          isDraw={!winner}
          gameName={gameDisplayName.title}
          targetScore={game.targetScore}
          startingScore={game.startingScore}
          winCondition={game.winCondition}
          manualEndOnly={game.manualEndOnly}
          winnerStats={winnerStats}
          standings={finalStandings.map(({ player, rank, isWinner }) => ({
            id: player.id,
            name: getPlayerDisplayName(player),
            initials: getInitials(player.name),
            avatarColor: player.avatarColor,
            score: player.score,
            rank,
            isWinner,
          }))}
          onDismiss={() => {
            setDismissedOutcomeKey(outcomeKey);
            setWinFxName(null);
          }}
          onReplay={() => {
            setDismissedOutcomeKey(outcomeKey);
            setWinFxName(null);
            onReplayGame();
          }}
          onBackToHome={() => {
            setDismissedOutcomeKey(outcomeKey);
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
              const isAccountPlayer =
                !!player.profileId && accountProfileIds.has(player.profileId);
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  rank={rank}
                  showRank={!allZero}
                  pulse={pulse}
                  isWinner={winner?.id === player.id}
                  isAccountPlayer={isAccountPlayer}
                  targetScore={game.targetScore}
                  startingScore={game.startingScore}
                  winCondition={game.winCondition}
                  onDelta={(playerId, delta) => {
                    onUpdateScore(playerId, delta);
                    onTriggerPulse(playerId, delta);
                    scheduleResort();
                    setLastScoreAction({
                      playerId,
                      playerName: getPlayerDisplayName(player),
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

      {referenceReached ? (
        <div
          className={`manualEndPrompt${game.timerEnabled ? " manualEndPrompt--withTimer" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>Reference reached</span>
          <button type="button" onClick={onEndGame}>
            End game
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
        onUpsertProfile={onUpsertProfile}
        onUpdatePlayer={onUpdatePlayer}
        onStartGame={onStartGame}
      />
    </>
  );
}
