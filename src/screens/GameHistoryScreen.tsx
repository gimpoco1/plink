import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
  type MouseEvent,
} from "react";
import { DEFAULT_TEAM_ICON } from "../constants";
import type { Game, ScoreHistoryEntry } from "../types";
import { getGameParticipants } from "../utils/gameParticipants";
import { avatarStyleFor } from "../utils/color";
import { capitalizeFirst, getInitials } from "../utils/text";
import {
  Clock3,
  Dumbbell,
  Flag,
  Flame,
  Shield,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import "./GameHistoryScreen.css";

type Props = {
  game: Game;
};

type HistorySubject = {
  id: string;
  name: string;
  avatarColor: string;
  icon?: string;
};

type HistoryAction = {
  key: string;
  subjectId: string;
  subjectName: string;
  avatarColor: string;
  icon?: string;
  createdAt: number;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  entries: ScoreHistoryEntry[];
};

type HistoryTurn = {
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
  actions: HistoryAction[];
};

const ACTION_MERGE_WINDOW_MS = 15_000;
const TURN_BOUNDARY_WINDOW_MS = 60_000;

const TEAM_ICON_COMPONENTS = {
  dumbbell: Dumbbell,
  trophy: Trophy,
  shield: Shield,
  flag: Flag,
  target: Target,
  zap: Zap,
  flame: Flame,
  star: Star,
} as const;

function getDeltaLabel(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function getDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayLabel(
  timestamp: number,
  dateFormat: Intl.DateTimeFormat,
  dateWithYearFormat: Intl.DateTimeFormat,
) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.getFullYear() === today.getFullYear()
    ? dateFormat.format(date)
    : dateWithYearFormat.format(date);
}

export function GameHistoryScreen({ game }: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState("all");
  const filterDragRef = useRef({
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
    dragged: false,
  });
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [],
  );
  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }),
    [],
  );
  const dateWithYearFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  const entries = game.scoreHistory ?? [];
  const isTeamsGame = game.participantMode === "teams" && game.teams.length > 0;
  const subjectsByPlayerId = useMemo(() => {
    const map = new Map<string, HistorySubject>();

    for (const participant of getGameParticipants(game)) {
      const subject: HistorySubject = {
        id: participant.id,
        name: participant.name,
        avatarColor: participant.avatarColor,
        icon: participant.icon,
      };

      for (const member of participant.members) {
        map.set(member.id, subject);
      }
    }

    return map;
  }, [game]);
  const historyActions = useMemo(() => {
    const actions: HistoryAction[] = [];
    const chronologicalEntries = [...entries].reverse();

    for (const entry of chronologicalEntries) {
      const subject = subjectsByPlayerId.get(entry.playerId) ?? {
        id: entry.playerId,
        name: entry.playerName,
        avatarColor: entry.avatarColor,
      };
      const currentAction = actions[actions.length - 1];
      const shouldMergeIntoAction =
        currentAction &&
        currentAction.subjectId === subject.id &&
        currentAction.createdAt === entry.createdAt &&
        currentAction.scoreBefore === entry.scoreBefore &&
        currentAction.scoreAfter === entry.scoreAfter &&
        currentAction.delta === entry.delta;

      if (shouldMergeIntoAction) {
        currentAction.entries.push(entry);
        continue;
      }

      actions.push({
        key: entry.id,
        subjectId: subject.id,
        subjectName: subject.name,
        avatarColor: subject.avatarColor,
        icon: subject.icon,
        createdAt: entry.createdAt,
        scoreBefore: entry.scoreBefore,
        scoreAfter: entry.scoreAfter,
        delta: entry.delta,
        entries: [entry],
      });
    }

    return actions;
  }, [entries, subjectsByPlayerId]);
  const playerOptions = useMemo(() => {
    const subjects = new Map<string, HistorySubject>();

    for (const action of historyActions) {
      if (!subjects.has(action.subjectId)) {
        subjects.set(action.subjectId, {
          id: action.subjectId,
          name: action.subjectName,
          avatarColor: action.avatarColor,
          icon: action.icon,
        });
      }
    }

    return Array.from(subjects.values());
  }, [historyActions]);
  const showPlayerFilter = playerOptions.length > 1;
  const hasSelectedPlayer = playerOptions.some(
    (player) => player.id === selectedPlayerId,
  );
  const visibleActions =
    selectedPlayerId === "all" || !hasSelectedPlayer
      ? historyActions
      : historyActions.filter(
          (action) => action.subjectId === selectedPlayerId,
        );
  const visibleTurns = useMemo(() => {
    const turns: HistoryTurn[] = [];
    let currentTurnNumber = 0;
    let previousActionAt: number | null = null;

    for (const action of visibleActions) {
      if (
        previousActionAt === null ||
        action.createdAt - previousActionAt >= TURN_BOUNDARY_WINDOW_MS
      ) {
        currentTurnNumber += 1;
      }
      previousActionAt = action.createdAt;

      const currentTurn = turns[turns.length - 1];
      const shouldAppendToTurn =
        currentTurn &&
        currentTurn.subjectId === action.subjectId &&
        action.createdAt - currentTurn.createdAt <= ACTION_MERGE_WINDOW_MS;

      if (shouldAppendToTurn) {
        currentTurn.actions.push(action);
        currentTurn.createdAt = action.createdAt;
        currentTurn.scoreAfter = action.scoreAfter;
        currentTurn.totalDelta += action.delta;
        continue;
      }

      turns.push({
        key: action.key,
        turnNumber: currentTurnNumber,
        subjectId: action.subjectId,
        subjectName: action.subjectName,
        avatarColor: action.avatarColor,
        icon: action.icon,
        createdAt: action.createdAt,
        scoreBefore: action.scoreBefore,
        scoreAfter: action.scoreAfter,
        totalDelta: action.delta,
        actions: [action],
      });
    }

    return turns.reverse();
  }, [visibleActions]);

  const groupedEntries = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      turns: HistoryTurn[];
    }> = [];

    for (const turn of visibleTurns) {
      const key = getDayKey(turn.createdAt);
      const currentGroup = groups[groups.length - 1];
      if (currentGroup?.key === key) {
        currentGroup.turns.push(turn);
        continue;
      }

      groups.push({
        key,
        label: formatDayLabel(turn.createdAt, dateFormat, dateWithYearFormat),
        turns: [turn],
      });
    }

    return groups;
  }, [dateFormat, dateWithYearFormat, visibleTurns]);
  function handleFilterPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    filterDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      dragged: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleFilterPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = filterDragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 4) {
      drag.dragged = true;
      event.preventDefault();
    }
    event.currentTarget.scrollLeft = drag.scrollLeft - deltaX;
  }

  function handleFilterPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const drag = filterDragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    filterDragRef.current.pointerId = -1;
  }

  function handleFilterClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!filterDragRef.current.dragged) return;
    event.preventDefault();
    event.stopPropagation();
    filterDragRef.current.dragged = false;
  }

  function stopFilterTouchPropagation(event: TouchEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <main
      className={`content historyContent${
        isTeamsGame ? " historyContent--teams" : ""
      }`}
    >
      {entries.length > 0 ? (
        <section className="historyList" aria-label="Game history">
          {showPlayerFilter ? (
            <div
              className="historyFilter"
              aria-label={`Filter history by ${isTeamsGame ? "team" : "player"}`}
              onClickCapture={handleFilterClickCapture}
              onPointerDown={handleFilterPointerDown}
              onPointerMove={handleFilterPointerMove}
              onPointerUp={handleFilterPointerEnd}
              onPointerCancel={handleFilterPointerEnd}
              onTouchStart={stopFilterTouchPropagation}
              onTouchEnd={stopFilterTouchPropagation}
            >
              <button
                className={`historyFilter__chip${
                  selectedPlayerId === "all" || !hasSelectedPlayer
                    ? " historyFilter__chip--active"
                    : ""
                }`}
                type="button"
                onClick={() => setSelectedPlayerId("all")}
              >
                All
              </button>
              {playerOptions.map((player) => (
                <button
                  key={player.id}
                  className={`historyFilter__chip${
                    selectedPlayerId === player.id
                      ? " historyFilter__chip--active"
                      : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedPlayerId(player.id)}
                >
                  {player.icon ? (
                    <span
                      className="historyFilter__teamIcon"
                      aria-hidden="true"
                    >
                      <TeamIconGlyph icon={player.icon} size={13} />
                    </span>
                  ) : (
                    <span
                      className="historyFilter__swatch"
                      style={avatarStyleFor(player.avatarColor)}
                      aria-hidden="true"
                    />
                  )}
                  {capitalizeFirst(player.name)}
                </button>
              ))}
            </div>
          ) : null}
          {groupedEntries.map((group) => (
            <section className="historyGroup" key={group.key}>
              <h2 className="historyGroup__title">{group.label}</h2>
              <div className="historyRows">
                {group.turns.map((turn) => (
                  <HistoryTurnRow
                    key={turn.key}
                    turn={turn}
                    timeLabel={timeFormat.format(new Date(turn.createdAt))}
                    isTeamsGame={isTeamsGame}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : (
        <section className="empty historyEmpty">
          <h1 className="empty__title">No score history yet.</h1>
          <p className="empty__hint">Score changes will appear here.</p>
        </section>
      )}
    </main>
  );
}

function HistoryTurnRow({
  turn,
  timeLabel,
  isTeamsGame,
}: {
  turn: HistoryTurn;
  timeLabel: string;
  isTeamsGame: boolean;
}) {
  const displayName = capitalizeFirst(turn.subjectName);
  const deltaClass =
    turn.totalDelta >= 0
      ? "historyDelta historyDelta--pos"
      : "historyDelta historyDelta--neg";

  return (
    <article className="historyRow">
      {turn.icon ? (
        <div className="historyAvatar historyAvatar--team" aria-hidden="true">
          <TeamIconGlyph icon={turn.icon} size={16} />
        </div>
      ) : (
        <div
          className="historyAvatar"
          style={avatarStyleFor(turn.avatarColor)}
          aria-hidden="true"
        >
          {getInitials(turn.subjectName)}
        </div>
      )}
      <div className="historyInfo">
        <div className="historyInfo__top">
          <div className="historyInfo__name">{displayName}</div>
          <div className={deltaClass}>{getDeltaLabel(turn.totalDelta)}</div>
        </div>
        <div className="historyInfo__meta">
          <span className="historyTurnLabel">
            Turn <strong>{turn.turnNumber}</strong>
          </span>
          <span
            className="historyTimeChip"
            aria-label={`Scored at ${timeLabel}`}
          >
            <Clock3 size={11} strokeWidth={2.5} aria-hidden="true" />
            {timeLabel}
          </span>
        </div>
      </div>
      <div className="historyScore">
        <span>{turn.scoreBefore}</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12h14m0 0-5-5m5 5-5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <strong>{turn.scoreAfter}</strong>
      </div>
    </article>
  );
}

function TeamIconGlyph({ icon, size }: { icon?: string; size: number }) {
  const Icon =
    TEAM_ICON_COMPONENTS[
      (icon ?? DEFAULT_TEAM_ICON) as keyof typeof TEAM_ICON_COMPONENTS
    ] ?? Dumbbell;
  return <Icon size={size} strokeWidth={2.2} aria-hidden="true" />;
}
