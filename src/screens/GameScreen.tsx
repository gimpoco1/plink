import { useMemo } from "react";
import { usePlayerRatingsContext } from "../features/playerRatings/PlayerRatingsContext";
import { translate } from "../i18n/translate";
import { capitalizeFirst, getInitials } from "../utils/text";
import type { Player, PlayerRatingHistoryEntry } from "../types";
import {
  WinCelebration,
  type WinCelebrationProps,
} from "../components/WinCelebration/WinCelebration";
import { PlayerCard } from "../components/PlayerCard/PlayerCard";
import { TeamScoreCard } from "../components/TeamScoreCard/TeamScoreCard";
import { GameTimer } from "../components/GameTimer/GameTimer";
import { GameDiceTray } from "../components/GameDiceTray/GameDiceTray";
import { useGameScreenModel } from "../features/game/hooks/useGameScreenModel";
import type { GameScreenProps } from "../features/game/types/gameScreenTypes";
import { GameManagePlayersDialog } from "../features/game/components/GameManagePlayersDialog";
import "../features/game/styles/GameScreen.css";

type StandingLevelChange = NonNullable<
  WinCelebrationProps["winnerLevelChange"]
>;

function toStandingLevelChange(
  entry: PlayerRatingHistoryEntry,
): StandingLevelChange {
  const previousLevel = Math.round(entry.previousLevel * 10) / 10;
  const newLevel = Math.round(entry.newLevel * 10) / 10;
  return {
    previousLevel,
    newLevel,
    direction:
      newLevel > previousLevel
        ? "up"
        : newLevel < previousLevel
          ? "down"
          : "same",
  };
}

export function GameScreen(props: GameScreenProps) {
  const model = useGameScreenModel(props);
  const { historyByGameAndProfile } = usePlayerRatingsContext();
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
  const winnerLevelChange = useMemo(() => {
    if (isTeamsMode || !gameComplete || !winner?.profileId) return null;
    const entry = historyByGameAndProfile.get(`${game.id}:${winner.profileId}`);
    if (!entry) return null;
    return toStandingLevelChange(entry);
  }, [game.id, gameComplete, historyByGameAndProfile, isTeamsMode, winner?.profileId]);

  const playerLevelChanges = useMemo(() => {
    if (isTeamsMode || !gameComplete)
      return new Map<string, StandingLevelChange>();

    const changeByProfileId = new Map<string, StandingLevelChange>();

    finalStandings.forEach(({ entry }) => {
      if (!("profileId" in entry) || !entry.profileId) return;

      const ratingEntry = historyByGameAndProfile.get(
        `${game.id}:${entry.profileId}`,
      );
      if (!ratingEntry) return;

      changeByProfileId.set(
        entry.profileId,
        toStandingLevelChange(ratingEntry),
      );
    });

    return changeByProfileId;
  }, [finalStandings, game.id, gameComplete, historyByGameAndProfile, isTeamsMode]);

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
          winnerLevelChange={winnerLevelChange}
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
            levelChange:
              "profileId" in entry && entry.profileId
                ? (playerLevelChanges.get(entry.profileId) ?? null)
                : null,
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
                      const isAccountPlayer = isCurrentUserPlayer(player);
                      return (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          rank={rank}
                          showRank={!allZero}
                          pulse={pulse}
                          isWinner={winner?.id === player.id}
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

      {game.diceEnabled ? (
        <GameDiceTray accentTone={isTeamGame ? "team" : "default"} />
      ) : null}

      {canManageGame ? <GameManagePlayersDialog model={model} /> : null}
    </div>
  );
}
