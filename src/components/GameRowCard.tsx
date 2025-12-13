import { useMemo, useRef, useState } from "react";
import type { Game } from "../types";
import { sortPlayers } from "../utils/ranking";
import { capitalizeFirst } from "../utils/text";

type Props = {
  game: Game;
  createdLabel: string;
  onEnter: () => void;
  onDelete: () => void;
};

export function GameRowCard({ game, createdLabel, onEnter, onDelete }: Props) {
  const ACTION_WIDTH = 104;

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
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (drag.isHorizontal === undefined) {
      if (absDx < 6 && absDy < 6) return;
      drag.isHorizontal = absDx > absDy + 4;
    }

    if (!drag.isHorizontal) return;
    e.preventDefault();
    if (!isSwiping) setIsSwiping(true);

    const next = Math.max(-ACTION_WIDTH, Math.min(0, drag.startSwipeX + dx));
    setSwipeX(next);
  }

  function onPointerUpOrCancel(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setIsSwiping(false);
    if (swipeX <= -ACTION_WIDTH * 0.5) openSwipe();
    else closeSwipe();
  }

  const winner = useMemo(() => {
    if (!game.players.length) return null;
    const top = [...game.players].sort(sortPlayers)[0];
    return top && top.score >= game.targetPoints ? top : null;
  }, [game.players, game.targetPoints]);

  const status = winner ? "Finished" : "In progress";
  const displayName = game.name.trim() ? game.name.trim().replace(/^./, (c) => c.toUpperCase()) : "Game";
  const accent = useMemo(() => game.accentColor ?? "#94a3b8", [game.accentColor]);
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
        onClick={() => {
          if (swipeX !== 0 && !isSwiping) closeSwipe();
        }}
      >
        <button className="gameRow__main" type="button" onClick={onEnter} aria-label={`Enter ${game.name}`}>
          <div className="gameRow__head">
            <div className="gameRow__name">{displayName}</div>
            {winnerName ? <span className="pill pill--winner">Winner: {winnerName}</span> : null}
            <div className="gameRow__date" aria-label={`Created ${createdLabel}`}>
              {createdLabel}
            </div>
          </div>
          <div className="gameRow__meta">
            <span className="pill">{status}</span>
            <span className="pill">{game.players.length} players</span>
            <span className="pill">Win: {game.targetPoints} points</span>
          </div>
        </button>
      </article>
    </div>
  );
}
