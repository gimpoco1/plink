import { useMemo, useRef, useState } from "react";
import type { Player } from "../../types";
import { QUICK_DELTAS } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import { capitalizeFirst, getInitials } from "../../utils/text";
import "./PlayerCard.css";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return "long ago";
}

type Props = {
  player: Player;
  rank: number;
  showRank: boolean;
  pulse?: "pos" | "neg";
  isWinner?: boolean;
  targetPoints: number;
  onDelta: (playerId: string, delta: number) => void;
  onDelete: (playerId: string) => void;
};

export function PlayerCard({
  player,
  rank,
  showRank,
  pulse,
  isWinner,
  targetPoints,
  onDelta,
  onDelete,
}: Props) {
  const displayName = capitalizeFirst(player.name);
  const initials = getInitials(player.name);
  const scoreClass =
    player.score > 0
      ? "score score--pos"
      : player.score < 0
        ? "score score--neg"
        : "score";
  const [customRaw, setCustomRaw] = useState("");
  const customValue = useMemo(
    () => Number.parseInt(customRaw, 10),
    [customRaw],
  );
  const canApplyCustom =
    Number.isFinite(customValue) && Math.abs(customValue) > 0;
  const ACTION_WIDTH = 92;
  const progress = Math.min(
    100,
    Math.max(0, (player.score / targetPoints) * 100),
  );

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
      setTimeout(() => setIsSwiping(false), 100);
    } else {
      setIsSwiping(false);
    }
  }

  const negDeltas = QUICK_DELTAS.filter((d) => d < 0).reverse(); // [-1, -3, -5]
  const posDeltas = QUICK_DELTAS.filter((d) => d > 0).reverse(); // [5, 3, 1]

  return (
    <div
      className="swipeRow"
      data-open={swipeX !== 0 ? "true" : "false"}
      style={{ ["--swipeW" as never]: `${ACTION_WIDTH}px` }}
    >
      <div className="swipeAction" aria-hidden={swipeX === 0}>
        <button
          className="swipeDelete"
          type="button"
          onClick={() => {
            closeSwipe();
            onDelete(player.id);
          }}
          aria-label={`Delete ${player.name}`}
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
          Remove
        </button>
      </div>

      <article
        className={`card swipeCard${isSwiping ? " swipeCard--dragging" : ""}${
          isWinner
            ? " card--winner"
            : rank === 1 && showRank
              ? " card--leader"
              : ""
        }`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
        onClick={() => {
          if (swipeX !== 0 && !isSwiping) closeSwipe();
        }}
      >
        <div className="cardHeader">
          <div className="cardHeader__left">
            {showRank ? (
              <div className="rank" aria-label={`Rank ${rank}`}>
                #{rank}
              </div>
            ) : null}
            <div
              className="avatar"
              style={avatarStyleFor(player.avatarColor)}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="who">
              <div className="who__name">{displayName}</div>
              {player.reachedAt > player.createdAt && (
                <div className="who__lastUpdate">
                  Last: {formatRelativeTime(player.reachedAt)}
                </div>
              )}
            </div>
          </div>

          <div className="cardHeader__right">
            <div
              className={`${scoreClass}${pulse ? ` score--pulse-${pulse}` : ""}`}
              aria-label={`Score ${player.score}`}
            >
              {player.score}
            </div>
            {isWinner ? (
              <div className="winnerMark" aria-label="Winner">
                🏆
              </div>
            ) : null}
          </div>
        </div>

        <div className="progressContainer">
          <div className="progressBar" style={{ width: `${progress}%` }} />
        </div>

        <div className="cardBody">
          <div className="compactControls">
            <div className="deltaGroup deltaGroup--neg">
              {negDeltas.map((delta) => (
                <button
                  key={delta}
                  type="button"
                  className="dot dot--neg"
                  onClick={(e) => {
                    if (isSwiping) return;
                    if (swipeX !== 0) {
                      closeSwipe();
                      e.stopPropagation();
                    } else {
                      onDelta(player.id, delta);
                    }
                  }}
                >
                  {delta}
                </button>
              ))}
            </div>

            <div className="customPod">
              <input
                className="input input--mini"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={customRaw}
                onChange={(e) =>
                  setCustomRaw(e.target.value.replace(/[^\d]/g, ""))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canApplyCustom) {
                    onDelta(player.id, Math.abs(customValue));
                    setCustomRaw("");
                  }
                }}
              />
              <div className="podButtons">
                <button
                  className="podBtn podBtn--neg"
                  type="button"
                  disabled={!canApplyCustom}
                  onClick={(e) => {
                    if (isSwiping) return;
                    if (swipeX !== 0) {
                      closeSwipe();
                      e.stopPropagation();
                    } else {
                      onDelta(player.id, -Math.abs(customValue));
                      setCustomRaw("");
                    }
                  }}
                >
                  −
                </button>
                <button
                  className="podBtn podBtn--pos"
                  type="button"
                  disabled={!canApplyCustom}
                  onClick={(e) => {
                    if (isSwiping) return;
                    if (swipeX !== 0) {
                      closeSwipe();
                      e.stopPropagation();
                    } else {
                      onDelta(player.id, Math.abs(customValue));
                      setCustomRaw("");
                    }
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div className="deltaGroup deltaGroup--pos">
              {posDeltas.map((delta) => (
                <button
                  key={delta}
                  type="button"
                  className="dot dot--pos"
                  onClick={(e) => {
                    if (isSwiping) return;
                    if (swipeX !== 0) {
                      closeSwipe();
                      e.stopPropagation();
                    } else {
                      onDelta(player.id, delta);
                    }
                  }}
                >
                  +{delta}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
