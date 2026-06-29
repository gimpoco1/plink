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
  const groupedEntries = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      entries: ScoreHistoryEntry[];
    }> = [];

    for (const entry of visibleEntries) {
      const key = getDayKey(entry.createdAt);
      const currentGroup = groups[groups.length - 1];
      if (currentGroup?.key === key) {
        currentGroup.entries.push(entry);
        continue;
      }

      groups.push({
        key,
        label: formatDayLabel(entry.createdAt, dateFormat, dateWithYearFormat),
        entries: [entry],
      });
    }

    return groups;
  }, [dateFormat, dateWithYearFormat, visibleEntries]);

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
                {group.entries.map((entry) => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    timeLabel={timeFormat.format(new Date(entry.createdAt))}
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

function HistoryRow({
  entry,
  timeLabel,
}: {
  entry: ScoreHistoryEntry;
  timeLabel: string;
}) {
  const displayName = capitalizeFirst(entry.playerName);
  const deltaClass =
    entry.delta > 0
      ? "historyDelta historyDelta--pos"
      : "historyDelta historyDelta--neg";

  return (
    <article className="historyRow">
      <div
        className="historyAvatar"
        style={avatarStyleFor(entry.avatarColor)}
        aria-hidden="true"
      >
        {getInitials(entry.playerName)}
      </div>
      <div className="historyInfo">
        <div className="historyInfo__top">
          <div className="historyInfo__name">{displayName}</div>
          <div className={deltaClass}>{getDeltaLabel(entry.delta)}</div>
        </div>
        <div className="historyInfo__meta">
          <span>{timeLabel}</span>
        </div>
      </div>
      <div className="historyScore">
        <span>{entry.scoreBefore}</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12h14m0 0-5-5m5 5-5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <strong>{entry.scoreAfter}</strong>
      </div>
    </article>
  );
}
