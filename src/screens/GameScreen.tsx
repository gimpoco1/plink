import { translate } from "../i18n/translate";
import { useEffect, useMemo, useRef, useState } from "react";
import { capitalizeFirst, getInitials } from "../utils/text";
import type { Player } from "../types";
import { WinCelebration } from "../components/WinCelebration/WinCelebration";
import { PlayerCard } from "../components/PlayerCard/PlayerCard";
import { TeamScoreCard } from "../components/TeamScoreCard/TeamScoreCard";
import { GameTimer } from "../components/GameTimer/GameTimer";
import { GameToolsDock } from "../components/GameToolsDock/GameToolsDock";
import { useGameScreenModel } from "../features/game/hooks/useGameScreenModel";
import type { GameScreenProps } from "../features/game/types/gameScreenTypes";
import { GameManagePlayersDialog } from "../features/game/components/GameManagePlayersDialog";
import "../features/game/styles/GameScreen.css";

type StoredTurnTracker = {
  isEnabled: boolean;
  activeParticipantId: string | null;
  round: number;
  participantIds: string[];
};

function turnTrackerStorageKey(gameId: string) {
  return `plink:turn-tracker:${gameId}:v1`;
}

function loadTurnTracker(gameId: string): StoredTurnTracker | null {
  try {
    const raw = window.localStorage.getItem(turnTrackerStorageKey(gameId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredTurnTracker>;
    if (!Array.isArray(value.participantIds)) return null;
    return {
      isEnabled: value.isEnabled === true,
      activeParticipantId:
        typeof value.activeParticipantId === "string"
          ? value.activeParticipantId
          : null,
      round:
        typeof value.round === "number" && value.round > 0
          ? Math.trunc(value.round)
          : 1,
      participantIds: value.participantIds.filter(
        (participantId): participantId is string =>
          typeof participantId === "string",
      ),
    };
  } catch {
    return null;
  }
}

export function GameScreen(props: GameScreenProps) {
  const TURN_AUTO_ADVANCE_DELAY_MS = 2800;
  const model = useGameScreenModel(props);
  const {
    savedTeamIconByName,
    takenProfileIds,
    getPlayerDisplayName,
    isCurrentUserPlayer,
    hasPlayers,
    isTeamGame,
    isTeamsMode,
    winFxName,
    setWinFxName,
    dismissedOutcomeKey,
    setDismissedOutcomeKey,
    lastScoreAction,
    setLastScoreAction,
    lowToHigh,
    orderedPlayers,
    ranks,
    scheduleResort,
    allZero,
    orderedParticipants,
    participantRanks,
    winner,
    winningParticipant,
    gameComplete,
    gameDraw,
    completionKind,
    outcomeKey,
    gameDisplayName,
    finalStandings,
    teamSections,
    showWinSummary,
    referenceReached,
    ...screenProps
  } = model;
  const {
    game,
    canManageGame,
    canManageLifecycle,
    managePlayersDialogRef,
    pulseById,
    onTriggerPulse,
    onUpdateScore,
    onDeletePlayer,
    winnerStats,
    isLatestCompletedGame,
    onReplayGame,
    onBackToHome,
    onEndGame,
  } = screenProps;
  const toolParticipants = useMemo(
    () =>
      [...orderedParticipants]
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
          return a.name.localeCompare(b.name);
        })
        .map((participant) => ({
          id: participant.id,
          name: participant.name,
          avatarColor: participant.avatarColor,
          icon: participant.icon,
        })),
    [orderedParticipants],
  );
  const [activeTurnParticipantId, setActiveTurnParticipantId] = useState<
    string | null
  >(null);
  const [isTurnTrackingEnabled, setIsTurnTrackingEnabled] = useState(false);
  const [turnRound, setTurnRound] = useState(1);
  const [turnOrderParticipantIds, setTurnOrderParticipantIds] = useState<
    string[]
  >([]);
  const [loadedTurnTrackerGameId, setLoadedTurnTrackerGameId] = useState<
    string | null
  >(null);
  const turnAdvanceTimeoutRef = useRef<number | null>(null);
  const canReorderTurnOrder = true;

  function clearPendingTurnAdvance() {
    if (turnAdvanceTimeoutRef.current === null) return;
    window.clearTimeout(turnAdvanceTimeoutRef.current);
    turnAdvanceTimeoutRef.current = null;
  }

  useEffect(() => {
    const stored = loadTurnTracker(game.id);
    setIsTurnTrackingEnabled(stored?.isEnabled ?? false);
    setActiveTurnParticipantId(stored?.activeParticipantId ?? null);
    setTurnRound(stored?.round ?? 1);
    setTurnOrderParticipantIds(stored?.participantIds ?? []);
    setLoadedTurnTrackerGameId(game.id);
    clearPendingTurnAdvance();
  }, [game.id]);

  useEffect(() => {
    if (loadedTurnTrackerGameId !== game.id) return;
    try {
      window.localStorage.setItem(
        turnTrackerStorageKey(game.id),
        JSON.stringify({
          isEnabled: isTurnTrackingEnabled,
          activeParticipantId: activeTurnParticipantId,
          round: turnRound,
          participantIds: turnOrderParticipantIds,
        } satisfies StoredTurnTracker),
      );
    } catch {
      // Turn tracking continues for this session if storage is unavailable.
    }
  }, [
    activeTurnParticipantId,
    game.id,
    isTurnTrackingEnabled,
    loadedTurnTrackerGameId,
    turnOrderParticipantIds,
    turnRound,
  ]);

  useEffect(() => {
    return () => clearPendingTurnAdvance();
  }, []);

  useEffect(() => {
    const participantIds = toolParticipants.map(
      (participant) => participant.id,
    );
    if (!participantIds.length) {
      setActiveTurnParticipantId(null);
      setTurnRound(1);
      setTurnOrderParticipantIds([]);
      clearPendingTurnAdvance();
      return;
    }
    setTurnOrderParticipantIds((current) => {
      const currentSet = new Set(current);
      const kept = current.filter((id) => participantIds.includes(id));
      const added = participantIds.filter((id) => !currentSet.has(id));
      return [...kept, ...added];
    });
  }, [toolParticipants]);

  const turnOrderedParticipants = useMemo(() => {
    const byId = new Map(
      toolParticipants.map((participant) => [participant.id, participant]),
    );
    return turnOrderParticipantIds
      .map((id) => byId.get(id))
      .filter((participant): participant is NonNullable<typeof participant> =>
        Boolean(participant),
      );
  }, [toolParticipants, turnOrderParticipantIds]);

  const turnOrderedBoardParticipants = useMemo(() => {
    const byId = new Map(
      orderedParticipants.map((participant) => [participant.id, participant]),
    );
    return turnOrderParticipantIds
      .map((id) => byId.get(id))
      .filter((participant): participant is NonNullable<typeof participant> =>
        Boolean(participant),
      );
  }, [orderedParticipants, turnOrderParticipantIds]);

  const turnOrderedPlayers = useMemo(() => {
    const byId = new Map(orderedPlayers.map((player) => [player.id, player]));
    return turnOrderParticipantIds
      .map((id) => byId.get(id))
      .filter((player): player is NonNullable<typeof player> =>
        Boolean(player),
      );
  }, [orderedPlayers, turnOrderParticipantIds]);

  const displayedParticipants =
    isTurnTrackingEnabled &&
    turnOrderedBoardParticipants.length === orderedParticipants.length
      ? turnOrderedBoardParticipants
      : orderedParticipants;

  const displayedTeamSections = useMemo(() => {
    if (
      !isTurnTrackingEnabled ||
      turnOrderedPlayers.length !== orderedPlayers.length
    ) {
      return teamSections;
    }

    const playersByTeamId = new Map<string, Player[]>();
    game.teams.forEach((team) => {
      playersByTeamId.set(team.id, []);
    });

    const unassignedPlayers: Player[] = [];
    turnOrderedPlayers.forEach((player) => {
      if (player.teamId && playersByTeamId.has(player.teamId)) {
        playersByTeamId.get(player.teamId)?.push(player);
      } else {
        unassignedPlayers.push(player);
      }
    });

    const groupedTeams = game.teams.map((team) => ({
      id: team.id,
      name: team.name,
      players: playersByTeamId.get(team.id) ?? [],
      isUnassigned: false,
    }));

    if (unassignedPlayers.length > 0 || groupedTeams.length === 0) {
      groupedTeams.push({
        id: "unassigned",
        name:
          groupedTeams.length > 0 ? "Unassigned" : translate("tabs.players"),
        players: unassignedPlayers,
        isUnassigned: true,
      });
    }

    return groupedTeams;
  }, [
    game.teams,
    isTurnTrackingEnabled,
    orderedPlayers.length,
    teamSections,
    turnOrderedPlayers,
  ]);

  useEffect(() => {
    if (!isTurnTrackingEnabled) {
      setActiveTurnParticipantId(null);
      setTurnRound(1);
      clearPendingTurnAdvance();
      return;
    }
    if (!turnOrderedParticipants.length) {
      setActiveTurnParticipantId(null);
      setTurnRound(1);
      clearPendingTurnAdvance();
      return;
    }

    if (!activeTurnParticipantId) {
      setActiveTurnParticipantId(turnOrderedParticipants[0]?.id ?? null);
      return;
    }
    const stillExists = turnOrderedParticipants.some(
      (participant) => participant.id === activeTurnParticipantId,
    );
    if (stillExists) return;
    setActiveTurnParticipantId(turnOrderedParticipants[0]?.id ?? null);
    clearPendingTurnAdvance();
  }, [activeTurnParticipantId, isTurnTrackingEnabled, turnOrderedParticipants]);

  function reorderTurnOrder(
    movingParticipantId: string,
    targetParticipantId: string,
  ) {
    if (!canReorderTurnOrder) return;
    if (movingParticipantId === targetParticipantId) return;
    setTurnOrderParticipantIds((current) => {
      const fromIndex = current.indexOf(movingParticipantId);
      const toIndex = current.indexOf(targetParticipantId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return current;
      next.splice(toIndex, 0, moved);
      const nextActiveParticipantId = next[0] ?? null;
      setActiveTurnParticipantId(nextActiveParticipantId);
      setTurnRound(1);
      clearPendingTurnAdvance();
      return next;
    });
  }

  function resetTurnTracker() {
    clearPendingTurnAdvance();
    setTurnRound(1);
    setActiveTurnParticipantId(
      isTurnTrackingEnabled ? (toolParticipants[0]?.id ?? null) : null,
    );
    setTurnOrderParticipantIds(
      toolParticipants.map((participant) => participant.id),
    );
  }

  function advanceTurn() {
    if (!activeTurnParticipantId || !turnOrderedParticipants.length) {
      return;
    }
    clearPendingTurnAdvance();
    const currentIndex = turnOrderedParticipants.findIndex(
      (participant) => participant.id === activeTurnParticipantId,
    );
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeIndex + 1) % turnOrderedParticipants.length;
    if (nextIndex === 0) setTurnRound((current) => current + 1);
    setActiveTurnParticipantId(turnOrderedParticipants[nextIndex]?.id ?? null);
  }

  function scheduleTurnAutoAdvance() {
    if (!isTurnTrackingEnabled || !activeTurnParticipantId) return;
    clearPendingTurnAdvance();
    turnAdvanceTimeoutRef.current = window.setTimeout(() => {
      turnAdvanceTimeoutRef.current = null;
      advanceTurn();
    }, TURN_AUTO_ADVANCE_DELAY_MS);
  }

  return (
    <div className={`gameScreen${isTeamsMode ? " gameScreen--teams" : ""}`}>
      {showWinSummary ? (
        <WinCelebration
          isTeamGame={isTeamsMode}
          winnerName={winFxName}
          resultKind={completionKind ?? "winner"}
          gameName={gameDisplayName.title}
          targetScore={game.targetScore}
          startingScore={game.startingScore}
          winCondition={game.winCondition}
          winByTwo={game.winByTwo}
          manualEndOnly={game.manualEndOnly}
          completedAt={game.endedAt ?? game.updatedAt ?? game.createdAt}
          winnerStats={winnerStats}
          isLatestCompletedGame={isLatestCompletedGame}
          standings={finalStandings.map(({ entry, rank, isWinner }) => ({
            id: entry.id,
            name: !isTeamGame
              ? getPlayerDisplayName(entry as Player)
              : capitalizeFirst(entry.name),
            initials: getInitials(entry.name),
            avatarColor: entry.avatarColor,
            icon: "icon" in entry ? entry.icon : undefined,
            score: entry.score,
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
      <main
        className={`content${game.timerEnabled ? " content--hasTimer" : ""}`}
      >
        {!hasPlayers ? (
          <section className="empty">
            <h1 className="empty__title">
              {!canManageGame
                ? translate("copy.waitingForTheSessionOwner")
                : isTeamsMode
                  ? translate("copy.manageTeamsToStart")
                  : translate("copy.managePlayersToStart")}
            </h1>
            {canManageGame ? (
              <button
                className="btn btn--primary btn--xl gameScreen__emptyCta"
                type="button"
                onClick={() => managePlayersDialogRef.current?.open()}
              >
                {isTeamsMode
                  ? translate("topbar.manageTeams")
                  : translate("topbar.managePlayers")}
              </button>
            ) : null}
          </section>
        ) : isTeamGame ? (
          <section className="teamBoard" aria-label={translate("home.teams")}>
            <div className="teamBoard__group">
              <div className="grid">
                {displayedParticipants.map((participant) => {
                  const gameTeam = participant.teamId
                    ? game.teams.find((team) => team.id === participant.teamId)
                    : undefined;
                  const resolvedIcon =
                    participant.icon ??
                    gameTeam?.icon ??
                    savedTeamIconByName.get(
                      participant.name.trim().toLowerCase(),
                    );

                  return (
                    <TeamScoreCard
                      key={participant.id}
                      id={participant.id}
                      name={participant.name}
                      icon={resolvedIcon}
                      members={participant.members}
                      rank={participantRanks.get(participant.id) ?? 1}
                      showRank={!allZero}
                      pulse={pulseById[participant.id]}
                      isWinner={winningParticipant?.id === participant.id}
                      isActiveTurn={
                        isTurnTrackingEnabled &&
                        activeTurnParticipantId === participant.id
                      }
                      targetScore={game.targetScore}
                      startingScore={game.startingScore}
                      winCondition={game.winCondition}
                      quickScoreValues={game.quickScoreValues}
                      onDelta={async (_participantId, delta) => {
                        const targetPlayerId = participant.members[0]?.id;
                        if (!targetPlayerId) return;
                        const updated = await onUpdateScore(
                          targetPlayerId,
                          delta,
                        );
                        if (!updated) return;
                        onTriggerPulse(participant.id, delta);
                        scheduleTurnAutoAdvance();
                        setLastScoreAction({
                          targetId: targetPlayerId,
                          pulseId: participant.id,
                          label: capitalizeFirst(participant.name),
                          delta,
                        });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <section className="teamBoard" aria-label={translate("tabs.players")}>
            {displayedTeamSections.map((section) => (
              <div
                key={section.id}
                className={`teamBoard__group${
                  section.isUnassigned ? " teamBoard__group--unassigned" : ""
                }`}
              >
                {section.players.length > 0 ? (
                  <div className="grid">
                    {section.players.map((player) => {
                      const rank = ranks.get(player.id) ?? 1;
                      const pulse = pulseById[player.id];
                      const isAccountPlayer = isCurrentUserPlayer(player);
                      return (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          rank={rank}
                          showRank={!allZero}
                          pulse={pulse}
                          isWinner={winner?.id === player.id}
                          isActiveTurn={
                            isTurnTrackingEnabled &&
                            activeTurnParticipantId === player.id
                          }
                          isAccountPlayer={isAccountPlayer}
                          isLinkedPlayer={
                            game.isShared === true &&
                            player.joinedViaInvite === true
                          }
                          isGameOwner={
                            game.isShared === true &&
                            game.hasCollaborators === true &&
                            (game.accessRole === "collaborator"
                              ? player.isGameOwner === true
                              : isAccountPlayer)
                          }
                          targetScore={game.targetScore}
                          startingScore={game.startingScore}
                          winCondition={game.winCondition}
                          quickScoreValues={game.quickScoreValues}
                          canDelete={canManageGame}
                          onDelta={async (playerId, delta) => {
                            const updated = await onUpdateScore(
                              playerId,
                              delta,
                            );
                            if (!updated) return;
                            onTriggerPulse(playerId, delta);
                            scheduleResort();
                            scheduleTurnAutoAdvance();
                            setLastScoreAction({
                              targetId: playerId,
                              pulseId: playerId,
                              label: getPlayerDisplayName(player),
                              delta,
                            });
                          }}
                          onDelete={(playerId) => void onDeletePlayer(playerId)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="teamBoard__empty">
                    {translate("copy.noPlayersAssignedYet")}
                  </div>
                )}
              </div>
            ))}
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
            {` ${translate("common.to")} `}
            {lastScoreAction.label}
          </span>
          <button
            type="button"
            onClick={async () => {
              const updated = await onUpdateScore(
                lastScoreAction.targetId,
                -lastScoreAction.delta,
              );
              if (!updated) return;
              onTriggerPulse(lastScoreAction.pulseId, -lastScoreAction.delta);
              if (!isTeamGame) scheduleResort();
              scheduleTurnAutoAdvance();
              setLastScoreAction(null);
            }}
          >
            {translate("copy.undo")}
          </button>
        </div>
      ) : null}

      {referenceReached && canManageLifecycle ? (
        <div
          className={`manualEndPrompt${game.timerEnabled ? " manualEndPrompt--withTimer" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>{translate("copy.referenceReached")}</span>
          <button type="button" onClick={onEndGame}>
            {translate("topbar.endGame")}
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

      {game.toolsEnabled ? (
        <GameToolsDock
          participants={turnOrderedParticipants}
          accentTone={isTeamGame ? "team" : "default"}
          isTurnTrackingEnabled={isTurnTrackingEnabled}
          onTurnTrackingChange={setIsTurnTrackingEnabled}
          canReorderTurnOrder={canReorderTurnOrder}
          onReorderTurnOrder={reorderTurnOrder}
          onResetTurnTracker={resetTurnTracker}
        />
      ) : null}

      {canManageGame ? <GameManagePlayersDialog model={model} /> : null}
    </div>
  );
}
