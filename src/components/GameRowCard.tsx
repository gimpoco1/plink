import { useMemo, useRef, useState } from "react";
import type { Game } from "../types";
import { findWinner } from "../utils/ranking";
import { capitalizeFirst } from "../utils/text";

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

  const status = winner ? "Finished" : "In progress";
  const displayName = game.name.trim()
    ? game.name.trim().toUpperCase()
    : "GAME";
  const accent = useMemo(
    () => game.accentColor ?? "#94a3b8",
    [game.accentColor],
  );
  const winnerName = winner ? capitalizeFirst(winner.name) : null;

  return (
    <div
      className="swipeRow"
      data-open={swipeX !== 0 ? "true" : "false"}
      style={{
        ["--swipeW" as never]: `${ACTION_WIDTH}px`,
        ["--accent" as never]: accent,
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
        onClick={(e) => {
          if (isSwiping) return;
          if (swipeX !== 0) {
            closeSwipe();
          } else {
            onEnter();
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onEnter();
          }
        }}
        aria-label={`Enter ${game.name}`}
      >
        <div className="gameRow__main">
          <div className="gameRow__head">
            <div className="gameRow__name">{displayName}</div>
            {winnerName ? (
              <span className="pill pill--winner">Winner: {winnerName}</span>
            ) : null}
            <div
              className="gameRow__date"
              aria-label={`Created ${createdLabel}`}
            >
              {createdLabel}
            </div>
          </div>
          <div className="gameRow__meta">
            <span className="pill">{status}</span>
            <span className="pill">{game.players.length} players</span>
            <span className="pill">
              {game.isLowScoreWins ? "Lose at" : "Win at"}: {game.targetPoints}{" "}
              points
            </span>
            <span className="pill">
              {game.isLowScoreWins ? "High score loses" : "High score wins"}
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
