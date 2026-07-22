import { capitalizeFirst, getInitials } from "../utils/text";
import type { Player } from "../types";
import { WinCelebration } from "../components/WinCelebration/WinCelebration";
import { PlayerCard } from "../components/PlayerCard/PlayerCard";
import { TeamScoreCard } from "../components/TeamScoreCard/TeamScoreCard";
import { GameTimer } from "../components/GameTimer/GameTimer";
import { GameDiceTray } from "../components/GameDiceTray/GameDiceTray";
import { useGameScreenModel } from "../features/game/hooks/useGameScreenModel";
import type { GameScreenProps } from "../features/game/types/gameScreenTypes";
import { GameManagePlayersDialog } from "../features/game/components/GameManagePlayersDialog";
import "../features/game/styles/GameScreen.css";

export function GameScreen(props: GameScreenProps) {
  const model = useGameScreenModel(props);
  const {
    savedTeamIconByName,
    takenProfileIds,
    accountProfileIds,
    getPlayerDisplayName,
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
                ? "Waiting for the game owner."
                : isTeamsMode
                  ? "Manage teams to start."
                  : "Manage players to start."}
            </h1>
            {canManageGame ? (
              <button
                className="btn btn--primary btn--xl gameScreen__emptyCta"
                type="button"
                onClick={() => managePlayersDialogRef.current?.open()}
              >
                {isTeamsMode ? "Manage teams" : "Manage players"}
              </button>
            ) : null}
          </section>
        ) : isTeamGame ? (
          <section className="teamBoard" aria-label="Teams">
            <div className="teamBoard__group">
              <div className="grid">
                {orderedParticipants.map((participant) => {
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
                      targetScore={game.targetScore}
                      startingScore={game.startingScore}
                      winCondition={game.winCondition}
                      onDelta={async (_participantId, delta) => {
                        const targetPlayerId = participant.members[0]?.id;
                        if (!targetPlayerId) return;
                        const updated = await onUpdateScore(
                          targetPlayerId,
                          delta,
                        );
                        if (!updated) return;
                        onTriggerPulse(participant.id, delta);
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
          <section className="teamBoard" aria-label="Players">
            {teamSections.map((section) => (
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
                      const isAccountPlayer =
                        !!player.profileId &&
                        accountProfileIds.has(player.profileId);
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
                          canDelete={canManageGame}
                          onDelta={async (playerId, delta) => {
                            const updated = await onUpdateScore(
                              playerId,
                              delta,
                            );
                            if (!updated) return;
                            onTriggerPulse(playerId, delta);
                            scheduleResort();
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
                    No players assigned yet.
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
            {" to "}
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
              setLastScoreAction(null);
            }}
          >
            Undo
          </button>
        </div>
      ) : null}

      {referenceReached && canManageLifecycle ? (
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

      {game.diceEnabled ? (
        <GameDiceTray accentTone={isTeamGame ? "team" : "default"} />
      ) : null}

      {canManageGame ? <GameManagePlayersDialog model={model} /> : null}
    </div>
  );
}
