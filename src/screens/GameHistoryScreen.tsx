import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
  type MouseEvent,
} from "react";
import type { Game, ScoreHistoryEntry } from "../types";
import { avatarStyleFor } from "../utils/color";
import { capitalizeFirst, getInitials } from "../utils/text";
import "./GameHistoryScreen.css";

type Props = {
  game: Game;
};

type HistoryTurn = {
  key: string;
  turnNumber: number;
  playerId: string;
  playerName: string;
  avatarColor: string;
  createdAt: number;
  scoreBefore: number;
  scoreAfter: number;
  totalDelta: number;
  entries: ScoreHistoryEntry[];
};

const TURN_GROUP_WINDOW_MS = 15_000;

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
      }),
    [],
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }),
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
  const playerOptions = useMemo(() => {
    const players = new Map<
      string,
      { id: string; name: string; avatarColor: string }
    >();

    for (const entry of entries) {
      if (!players.has(entry.playerId)) {
        players.set(entry.playerId, {
          id: entry.playerId,
          name: entry.playerName,
          avatarColor: entry.avatarColor,
        });
      }
    }

    return Array.from(players.values());
  }, [entries]);
  const showPlayerFilter = playerOptions.length > 1;
  const hasSelectedPlayer = playerOptions.some(
    (player) => player.id === selectedPlayerId,
  );
  const visibleEntries =
    selectedPlayerId === "all" || !hasSelectedPlayer
      ? entries
      : entries.filter((entry) => entry.playerId === selectedPlayerId);
  const visibleTurns = useMemo(() => {
    const chronologicalEntries = [...visibleEntries].reverse();
    const turns: HistoryTurn[] = [];

    for (const entry of chronologicalEntries) {
      const currentTurn = turns[turns.length - 1];
      const shouldAppendToTurn =
        currentTurn &&
        currentTurn.playerId === entry.playerId &&
        entry.createdAt - currentTurn.createdAt <= TURN_GROUP_WINDOW_MS;

      if (shouldAppendToTurn) {
        currentTurn.entries.push(entry);
        currentTurn.createdAt = entry.createdAt;
        currentTurn.scoreAfter = entry.scoreAfter;
        currentTurn.totalDelta += entry.delta;
        continue;
      }

      turns.push({
        key: entry.id,
        turnNumber: turns.length + 1,
        playerId: entry.playerId,
        playerName: entry.playerName,
        avatarColor: entry.avatarColor,
        createdAt: entry.createdAt,
        scoreBefore: entry.scoreBefore,
        scoreAfter: entry.scoreAfter,
        totalDelta: entry.delta,
        entries: [entry],
      });
    }

    return turns.reverse();
  }, [visibleEntries]);

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
    <main className="content historyContent">
      {entries.length > 0 ? (
        <section className="historyList" aria-label="Game history">
          {showPlayerFilter ? (
            <div
              className="historyFilter"
              aria-label="Filter history by player"
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
                  <span
                    className="historyFilter__swatch"
                    style={avatarStyleFor(player.avatarColor)}
                    aria-hidden="true"
                  />
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
}: {
  turn: HistoryTurn;
  timeLabel: string;
}) {
  const displayName = capitalizeFirst(turn.playerName);
  const deltaClass =
    turn.totalDelta >= 0
      ? "historyDelta historyDelta--pos"
      : "historyDelta historyDelta--neg";

  return (
    <article className="historyRow">
      <div
        className="historyAvatar"
        style={avatarStyleFor(turn.avatarColor)}
        aria-hidden="true"
      >
        {getInitials(turn.playerName)}
      </div>
      <div className="historyInfo">
        <div className="historyInfo__top">
          <div className="historyInfo__name">{displayName}</div>
          <div className={deltaClass}>{getDeltaLabel(turn.totalDelta)}</div>
        </div>
        <div className="historyInfo__meta">
          <span>Turn {turn.turnNumber}</span>
          <span>{timeLabel}</span>
        </div>
        {turn.entries.length > 1 ? (
          <div className="historyTurnSteps" aria-label="Score changes in this turn">
            {turn.entries.map((entry) => (
              <span
                key={entry.id}
                className={`historyTurnStep${
                  entry.delta >= 0 ? " historyTurnStep--pos" : " historyTurnStep--neg"
                }`}
              >
                {getDeltaLabel(entry.delta)}
              </span>
            ))}
          </div>
        ) : null}
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
