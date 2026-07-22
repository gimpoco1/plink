import { useMemo } from "react";
import type { Game, ScoreHistoryEntry } from "../../../types";
import { getGameParticipants } from "../../../utils/gameParticipants";

export type HistorySubject = {
  id: string;
  name: string;
  avatarColor: string;
  icon?: string;
  isCurrentUser?: boolean;
};
type HistoryAction = HistorySubject & {
  key: string;
  subjectId: string;
  subjectName: string;
  createdAt: number;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  updatedBy?: HistorySubject;
  entries: ScoreHistoryEntry[];
};
export type HistoryTurn = {
  key: string;
  turnNumber: number;
  subjectId: string;
  subjectName: string;
  avatarColor: string;
  icon?: string;
  createdAt: number;
  scoreBefore: number;
  scoreAfter: number;
  totalDelta: number;
  updatedBy?: HistorySubject;
  actions: HistoryAction[];
};

const ACTION_MERGE_WINDOW_MS = 15_000;
const TURN_BOUNDARY_WINDOW_MS = 60_000;

function getDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDayLabel(
  timestamp: number,
  short: Intl.DateTimeFormat,
  long: Intl.DateTimeFormat,
) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.getFullYear() === today.getFullYear()
    ? short.format(date)
    : long.format(date);
}

export function useGameHistory(game: Game, selectedSubjectId: string) {
  const entries = game.scoreHistory ?? [];
  const isTeamsGame = game.participantMode === "teams";
  const hasInvitedPlayer = game.players.some(
    (player) => player.joinedViaInvite === true,
  );
  const ownerPlayerId = game.players.find(
    (player) => player.isGameOwner === true,
  )?.id;
  const recordedUpdaterIds = new Set(
    entries.flatMap((entry) =>
      entry.updatedByPlayerId ? [entry.updatedByPlayerId] : [],
    ),
  );
  const hasInvitedUpdaterHistory = ownerPlayerId
    ? [...recordedUpdaterIds].some((playerId) => playerId !== ownerPlayerId)
    : recordedUpdaterIds.size > 1;
  const showUpdaterAttribution =
    hasInvitedPlayer || hasInvitedUpdaterHistory;
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [],
  );
  const shortDate = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }),
    [],
  );
  const longDate = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );
  const subjectsByPlayerId = useMemo(() => {
    const map = new Map<string, HistorySubject>();
    for (const participant of getGameParticipants(game)) {
      const subject: HistorySubject = {
        id: participant.id,
        name: participant.name,
        avatarColor: participant.avatarColor,
        icon: participant.icon,
      };
      for (const member of participant.members) map.set(member.id, subject);
    }
    return map;
  }, [game]);
  const currentUserPlayerId =
    game.accessRole === "collaborator"
      ? game.linkedPlayerIdForCurrentUser
      : game.players.find((player) => player.isGameOwner)?.id;
  const actions = useMemo(() => {
    const result: HistoryAction[] = [];
    for (const entry of [...entries].reverse()) {
      const subject = subjectsByPlayerId.get(entry.playerId) ?? {
        id: entry.playerId,
        name: entry.playerName,
        avatarColor: entry.avatarColor,
      };
      const current = result[result.length - 1];
      const updatedBy = showUpdaterAttribution && entry.updatedByPlayerId
        ? {
            id: entry.updatedByPlayerId,
            name: entry.updatedByPlayerName ?? "Unknown player",
            avatarColor: entry.updatedByAvatarColor ?? "#6f7b8f",
            isCurrentUser:
              entry.updatedByPlayerId === currentUserPlayerId,
          }
        : undefined;
      if (
        current &&
        current.subjectId === subject.id &&
        current.updatedBy?.id === updatedBy?.id &&
        current.createdAt === entry.createdAt &&
        current.scoreBefore === entry.scoreBefore &&
        current.scoreAfter === entry.scoreAfter &&
        current.delta === entry.delta
      ) {
        current.entries.push(entry);
      } else {
        result.push({
          ...subject,
          key: entry.id,
          subjectId: subject.id,
          subjectName: subject.name,
          createdAt: entry.createdAt,
          scoreBefore: entry.scoreBefore,
          scoreAfter: entry.scoreAfter,
          delta: entry.delta,
          updatedBy,
          entries: [entry],
        });
      }
    }
    return result;
  }, [currentUserPlayerId, entries, showUpdaterAttribution, subjectsByPlayerId]);
  const playerOptions = useMemo(() => {
    const subjects = new Map<string, HistorySubject>();
    for (const action of actions) {
      if (!subjects.has(action.subjectId)) {
        subjects.set(action.subjectId, {
          id: action.subjectId,
          name: action.subjectName,
          avatarColor: action.avatarColor,
          icon: action.icon,
        });
      }
    }
    return [...subjects.values()];
  }, [actions]);
  const hasSelectedPlayer = playerOptions.some(
    ({ id }) => id === selectedSubjectId,
  );
  const visibleActions =
    selectedSubjectId === "all" || !hasSelectedPlayer
      ? actions
      : actions.filter(({ subjectId }) => subjectId === selectedSubjectId);
  const turns = useMemo(() => {
    const result: HistoryTurn[] = [];
    let turnNumber = 0;
    let previousActionAt: number | null = null;
    for (const action of visibleActions) {
      if (
        previousActionAt === null ||
        action.createdAt - previousActionAt >= TURN_BOUNDARY_WINDOW_MS
      ) {
        turnNumber += 1;
      }
      previousActionAt = action.createdAt;
      const current = result[result.length - 1];
      if (
        current &&
        current.subjectId === action.subjectId &&
        current.updatedBy?.id === action.updatedBy?.id &&
        action.createdAt - current.createdAt <= ACTION_MERGE_WINDOW_MS
      ) {
        current.actions.push(action);
        current.createdAt = action.createdAt;
        current.scoreAfter = action.scoreAfter;
        current.totalDelta += action.delta;
      } else {
        result.push({
          key: action.key,
          turnNumber,
          subjectId: action.subjectId,
          subjectName: action.subjectName,
          avatarColor: action.avatarColor,
          icon: action.icon,
          createdAt: action.createdAt,
          scoreBefore: action.scoreBefore,
          scoreAfter: action.scoreAfter,
          totalDelta: action.delta,
          updatedBy: action.updatedBy,
          actions: [action],
        });
      }
    }
    return result.reverse();
  }, [visibleActions]);
  const groupedEntries = useMemo(() => {
    const groups: Array<{ key: string; label: string; turns: HistoryTurn[] }> =
      [];
    for (const turn of turns) {
      const key = getDayKey(turn.createdAt);
      const current = groups[groups.length - 1];
      if (current?.key === key) current.turns.push(turn);
      else
        groups.push({
          key,
          label: formatDayLabel(turn.createdAt, shortDate, longDate),
          turns: [turn],
        });
    }
    return groups;
  }, [longDate, shortDate, turns]);

  return {
    entries,
    isTeamsGame,
    timeFormat,
    playerOptions,
    showPlayerFilter: playerOptions.length > 1,
    hasSelectedPlayer,
    groupedEntries,
  };
}
