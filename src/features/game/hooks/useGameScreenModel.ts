import { useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "../../../types";
import {
  capitalizeFirst,
  formatAccountPlayerName,
  getGameDisplayName,
} from "../../../utils/text";
import {
  computeRanks,
  findWinner,
  isGameComplete,
  isGameDraw,
  sortPlayers,
} from "../../../utils/ranking";
import { getGameParticipants } from "../../../utils/gameParticipants";
import { hasGameEnded, shouldSortLowToHigh } from "../../../utils/scoring";
import { useDelayedRanking } from "../../../hooks/useDelayedRanking";
import type { GameScreenProps } from "../types/gameScreenTypes";

export function useGameScreenModel(props: GameScreenProps) {
  const { game, profiles, teams } = props;

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

  function isCurrentUserPlayer(player: Player) {
    if (game.isShared && game.accessRole === "collaborator") {
      return player.id === game.linkedPlayerIdForCurrentUser;
    }
    return (
      (!game.isShared || player.joinedViaInvite !== true) &&
      !!player.profileId &&
      accountProfileIds.has(player.profileId)
    );
  }

  function getPlayerDisplayName(player: Player) {
    return isCurrentUserPlayer(player)
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
  const completionKind: "winner" | "draw" | "completed" | null = gameComplete
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
    const hasReferenceTarget =
      game.winCondition === "reach_zero"
        ? game.startingScore > game.targetScore
        : game.targetScore > 0;

    if (
      !game.manualEndOnly ||
      gameComplete ||
      !hasReferenceTarget ||
      !game.players.length
    ) {
      return false;
    }

    return hasGameEnded(game.players, {
      ...game,
      manualEndOnly: false,
      endedAt: undefined,
    });
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

  return {
    ...props,
    savedTeamIconByName,
    takenProfileIds,
    accountProfileIds,
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
  };
}
