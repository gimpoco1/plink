import { useMemo, useRef, useState } from "react";
import type { Game } from "../types";
import { findWinner } from "../utils/ranking";
import { capitalizeFirst, getGameDisplayName } from "../utils/text";

type Props = {
  game: Game;
  createdLabel: string;
  onEnter: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export function GameRowCard({
  game,
  createdLabel,
  onEnter,
  onDuplicate,
  onRename,
  onDelete,
}: Props) {
  const ACTION_WIDTH = 240;

  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startSwipeX: number;
    isHorizontal?: boolean;
  } | null>(null);

  function closeSwipe() {
    setSwipeX(0);
  }

  function openSwipe() {
    setSwipeX(-ACTION_WIDTH);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startSwipeX: swipeX,
    };
    setIsSwiping(false);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (drag.isHorizontal === undefined) {
      // Need more movement to start a swipe on desktop to avoid accidental drags
      if (absDx < 12 && absDy < 12) return;

      drag.isHorizontal = absDx > absDy * 1.5 + 5;
      if (drag.isHorizontal) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsSwiping(true);
      }
    }

    if (!drag.isHorizontal) return;
    e.preventDefault();

    const next = Math.max(-ACTION_WIDTH, Math.min(0, drag.startSwipeX + dx));
    setSwipeX(next);
  }

  function onPointerUpOrCancel(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    dragRef.current = null;

    if (swipeX <= -ACTION_WIDTH * 0.5) {
      openSwipe();
    } else {
      closeSwipe();
    }

    if (isSwiping) {
      // If we were actually swiping, keep isSwiping true for a bit to block the click
      setTimeout(() => setIsSwiping(false), 100);
    } else {
      // If we never moved enough to trigger a swipe, reset immediately so the click works
      setIsSwiping(false);
    }
  }

  const winner = useMemo(() => {
    return findWinner(game.players, game.targetPoints, game.isLowScoreWins);
  }, [game.players, game.targetPoints, game.isLowScoreWins]);

  const parsedName = getGameDisplayName(game.name);
  const displayName = parsedName.title
    ? parsedName.title.toUpperCase()
    : "GAME";
  const winnerName = winner ? capitalizeFirst(winner.name) : null;

  return (
    <div
      className="swipeRow"
      data-open={swipeX !== 0 ? "true" : "false"}
      style={{
        ["--swipeW" as never]: `${ACTION_WIDTH}px`,
      }}
    >
      <div className="swipeAction" aria-hidden={swipeX === 0}>
        <button
          className="swipeRename"
          type="button"
          onClick={() => {
            closeSwipe();
            onRename();
          }}
          aria-label={`Rename game ${game.name}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Rename
        </button>
        <button
          className="swipeDuplicate"
          type="button"
          onClick={() => {
            closeSwipe();
            onDuplicate();
          }}
          aria-label={`Duplicate game ${game.name}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Re-play
        </button>
        <button
          className="swipeDelete"
          type="button"
          onClick={() => {
            closeSwipe();
            onDelete();
          }}
          aria-label={`Delete game ${game.name}`}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 3h6m-8 4h10m-9 0 .7 13h6.6L16 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Delete
        </button>
      </div>

      <article
        className={`card swipeCard gameRowCard${isSwiping ? " swipeCard--dragging" : ""}`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
      >
        <button
          className="gameRow__main"
          type="button"
          onClick={(e) => {
            if (isSwiping) return;
            if (swipeX !== 0) {
              closeSwipe();
              e.stopPropagation();
            } else {
              onEnter();
            }
          }}
          aria-label={`Open ${game.name}`}
        >
          <div className="gameRow__head">
            <div className="gameRow__titleGroup">
              <div className="gameRow__name">{displayName}</div>
              {parsedName.replayNumber ? (
                <span className="gameRow__replay">
                  #{parsedName.replayNumber}
                </span>
              ) : null}
            </div>
            <div
              className="gameRow__date"
              aria-label={`Created ${createdLabel}`}
            >
              {createdLabel}
            </div>
          </div>
          <div className="gameRow__meta">
            {winnerName ? (
              <span className="gameRow__detail gameRow__winnerDetail">
                <span className="gameRow__winnerIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8 4h8v4.5a4 4 0 0 1-8 0V4Zm0 2H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 12.5V17m-3 3h6m-5-3h4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="gameRow__winnerLabel">Winner</span>
                <strong>{winnerName}</strong>
              </span>
            ) : null}
            {!winner ? (
              <span className="gameRow__detail">
                <span className="gameRow__statusDot" aria-hidden="true" />
                In progress
              </span>
            ) : null}
            <span
              className="gameRow__detail gameRow__target"
              aria-label={`Target score ${game.targetPoints} points`}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20m17.5 0v-1.2a3.4 3.4 0 0 0-2.5-3.3M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-6.8a3.5 3.5 0 0 1 0 6.6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              {game.players.length}{" "}
              {game.players.length === 1 ? "player" : "players"}
            </span>
            <span className="gameRow__detail">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
              <span>Target</span>
              <strong>{game.targetPoints}</strong>
              <span>{game.targetPoints === 1 ? "pt" : "pts"}</span>
            </span>
          </div>
        </button>
      </article>
    </div>
  );
}
