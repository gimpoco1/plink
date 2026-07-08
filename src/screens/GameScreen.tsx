import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, GameTeam, Player, TeamMember } from "../types";
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
  isGameDraw,
  sortPlayers,
} from "../utils/ranking";
import { getGameParticipants } from "../utils/gameParticipants";
import { shouldSortLowToHigh } from "../utils/scoring";
import { WinCelebration } from "../components/WinCelebration/WinCelebration";
import { useDelayedRanking } from "../hooks/useDelayedRanking";
import {
  ManagePlayersDialog,
  ManagePlayersDialogHandle,
} from "../components/ManagePlayersDialog/ManagePlayersDialog";
import { PlayerCard } from "../components/PlayerCard/PlayerCard";
import { TeamScoreCard } from "../components/TeamScoreCard/TeamScoreCard";
import { GameTimer } from "../components/GameTimer/GameTimer";
import type { ProfileStats } from "../utils/profileStats";
import "./GameScreen.css";

type Props = {
  game: Game;
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  isAuthenticated: boolean;
  canUseTeams: boolean;
  managePlayersDialogRef: React.RefObject<ManagePlayersDialogHandle>;
  pulseById: Record<string, "pos" | "neg" | undefined>;
  onTriggerPulse: (playerId: string, delta: number) => void;
  onDeleteProfile: (profileId: string) => void;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onUpdateProfile: (
    profileId: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
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
    updates: Partial<
      Pick<Player, "name" | "avatarColor" | "profileId" | "teamId">
    >,
  ) => void;
  onCreateTeam: (
    name: string,
    icon?: string,
    members?: PlayerProfile[],
  ) => GameTeam | null;
  onDeleteTeam: (teamId: string, teamName: string) => Promise<void> | void;
  onDeleteSavedTeam: (
    teamId: string,
    teamName: string,
  ) => Promise<void> | void;
  onOpenTeamsTab: () => void;
  winnerStats: ProfileStats | null;
  onReplayGame: () => void;
  onBackToHome: () => void;
  onEndGame: () => void;
};

export function GameScreen({
  game,
  profiles,
  teams,
  teamMembers,
  isAuthenticated,
  canUseTeams,
  managePlayersDialogRef,
  pulseById,
  onTriggerPulse,
  onDeleteProfile,
  onUpsertProfile,
  onUpdateProfile,
  onStartGame,
  onUpdateScore,
  onDeletePlayer,
  onUpdatePlayer,
  onCreateTeam,
  onDeleteTeam,
  onDeleteSavedTeam,
  onOpenTeamsTab,
  winnerStats,
  onReplayGame,
  onBackToHome,
  onEndGame,
}: Props) {
  const savedTeamIconByName = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((team) => {
      const key = team.name.trim().toLowerCase();
      if (key && team.icon) map.set(key, team.icon);
    });
    return map;
  }, [teams]);

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
  const isTeamGame = game.participantMode === "teams" && game.teams.length > 0;
  const isTeamsMode = game.participantMode === "teams";
  const [winFxName, setWinFxName] = useState<string | null>(null);
  const [dismissedOutcomeKey, setDismissedOutcomeKey] = useState<string | null>(
    null,
  );
  const [lastScoreAction, setLastScoreAction] = useState<{
    targetId: string;
    pulseId: string;
    label: string;
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
  const orderedParticipants = useMemo(() => {
    return getGameParticipants(game).sort((a, b) =>
      sortPlayers(a, b, lowToHigh),
    );
  }, [game, lowToHigh]);
  const participantRanks = useMemo(
    () => computeRanks(orderedParticipants),
    [orderedParticipants],
  );

  const winner = useMemo(() => {
    return findWinner(game.players, game);
  }, [game]);
  const winningParticipant = useMemo(() => {
    if (!winner) return null;
    return (
      orderedParticipants.find((participant) =>
        participant.members.some((member) => member.id === winner.id),
      ) ?? null
    );
  }, [orderedParticipants, winner]);
  const gameComplete = useMemo(() => isGameComplete(game), [game]);
  const gameDraw = useMemo(() => isGameDraw(game), [game]);
  const completionKind = gameComplete
    ? winner
      ? "winner"
      : gameDraw
        ? "draw"
        : "completed"
    : null;
  const outcomeKey = gameComplete
    ? winner
      ? `winner:${winner.id}:${game.endedAt ?? game.updatedAt}`
      : `${completionKind}:${game.endedAt ?? game.updatedAt}`
    : null;

  const gameDisplayName = useMemo(
    () => getGameDisplayName(game.name),
    [game.name],
  );

  const finalStandings = useMemo(() => {
    const sorted = isTeamGame
      ? orderedParticipants
      : [...game.players].sort((a, b) => sortPlayers(a, b, lowToHigh));
    const ranksMap = computeRanks(sorted);
    return sorted.map((entry) => ({
      entry,
      rank: ranksMap.get(entry.id) ?? 1,
      isWinner: isTeamGame
        ? winningParticipant?.id === entry.id
        : winner?.id === entry.id,
    }));
  }, [
    game.players,
    isTeamGame,
    lowToHigh,
    orderedParticipants,
    winner?.id,
    winningParticipant?.id,
  ]);
  const teamSections = useMemo(() => {
    const playersByTeamId = new Map<string, Player[]>();
    game.teams.forEach((team) => {
      playersByTeamId.set(team.id, []);
    });

    const unassignedPlayers: Player[] = [];
    orderedPlayers.forEach((player) => {
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
        name: groupedTeams.length > 0 ? "Unassigned" : "Players",
        players: unassignedPlayers,
        isUnassigned: true,
      });
    }

    return groupedTeams;
  }, [game.teams, orderedPlayers]);

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
      setWinFxName(
        capitalizeFirst(winningParticipant?.name ?? winner?.name ?? ""),
      );
      setDismissedOutcomeKey(null);
    }
    prevOutcomeKeyRef.current = outcomeKey;
  }, [outcomeKey, winner?.name, winningParticipant?.name]);

  useEffect(() => {
    if (!lastScoreAction) return;
    const timeout = window.setTimeout(() => setLastScoreAction(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [lastScoreAction]);

  useEffect(() => setLastScoreAction(null), [game.id]);
  useEffect(() => setDismissedOutcomeKey(null), [game.id]);

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
          manualEndOnly={game.manualEndOnly}
          winnerStats={isTeamGame ? null : winnerStats}
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
              {isTeamsMode
                ? "Manage teams to start."
                : "Manage players to start."}
            </h1>
            <button
              className="btn btn--primary btn--xl gameScreen__emptyCta"
              type="button"
              onClick={() => managePlayersDialogRef.current?.open()}
            >
              {isTeamsMode ? "Manage teams" : "Manage players"}
            </button>
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
                      onDelta={(_participantId, delta) => {
                        const targetPlayerId = participant.members[0]?.id;
                        if (!targetPlayerId) return;
                        onUpdateScore(targetPlayerId, delta);
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
                          onDelta={(playerId, delta) => {
                            onUpdateScore(playerId, delta);
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
            onClick={() => {
              onUpdateScore(lastScoreAction.targetId, -lastScoreAction.delta);
              onTriggerPulse(lastScoreAction.pulseId, -lastScoreAction.delta);
              if (!isTeamGame) scheduleResort();
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
        participantMode={game.participantMode === "teams" ? "teams" : "players"}
        profiles={profiles}
        savedTeams={teams}
        savedTeamMembers={teamMembers}
        currentPlayers={game.players}
        currentTeams={game.teams}
        canUseTeams={canUseTeams}
        takenProfileIds={takenProfileIds}
        isAuthenticated={isAuthenticated}
        onDeleteProfile={(profileId) => onDeleteProfile(profileId)}
        onDeletePlayer={onDeletePlayer}
        onUpsertProfile={onUpsertProfile}
        onUpdateProfile={onUpdateProfile}
        onUpdatePlayer={onUpdatePlayer}
        onCreateTeam={onCreateTeam}
        onDeleteTeam={onDeleteTeam}
        onDeleteSavedTeam={onDeleteSavedTeam}
        onStartGame={onStartGame}
        onOpenTeamsTab={onOpenTeamsTab}
      />
    </div>
  );
}
