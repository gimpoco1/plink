import { useMemo, useRef, useState } from "react";
import {
  Copy,
  Crosshair,
  Pencil,
  Trash2,
  Trophy,
  User,
  Users,
} from "lucide-react";
import type { Game } from "../../types";
import { findWinner, isGameComplete, isGameDraw } from "../../utils/ranking";
import { getGameParticipants } from "../../utils/gameParticipants";
import { capitalizeFirst, getGameDisplayName } from "../../utils/text";
import "./GameRowCard.css";

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
    return findWinner(game.players, game);
  }, [game]);
  const participants = useMemo(() => getGameParticipants(game), [game]);
  const complete = useMemo(() => isGameComplete(game), [game]);
  const draw = useMemo(() => isGameDraw(game), [game]);
  const isTeamsGame = game.participantMode === "teams" && game.teams.length > 0;

  const parsedName = getGameDisplayName(game.name);
  const displayName = parsedName.title
    ? parsedName.title.toUpperCase()
    : "GAME";
  const winningParticipant = useMemo(() => {
    if (!winner) return null;
    return (
      participants.find((participant) =>
        participant.members.some((member) => member.id === winner.id),
      ) ?? null
    );
  }, [participants, winner]);
  const winnerName = winner
    ? isTeamsGame
      ? (winningParticipant?.name ?? capitalizeFirst(winner.name))
      : capitalizeFirst(winner.name)
    : null;
  const participantCount = isTeamsGame
    ? game.teams.length
    : game.players.length;

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
          <Pencil size={18} strokeWidth={2} aria-hidden="true" />
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
          <Copy size={18} strokeWidth={2} aria-hidden="true" />
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
          <Trash2 size={18} strokeWidth={2} aria-hidden="true" />
          Delete
        </button>
      </div>

      <article
        className={`card swipeCard gameRowCard${
          isTeamsGame ? " gameRowCard--teams" : ""
        }${isSwiping ? " swipeCard--dragging" : ""}`}
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
            <div className="gameRow__headMeta">
              {isTeamsGame ? (
                <span
                  className="gameRow__modeBadge gameRow__modeBadge--teams"
                  aria-label="Team game"
                >
                  <Users size={14} strokeWidth={2.3} aria-hidden="true" />
                  <span>Teams</span>
                </span>
              ) : null}
              <div
                className="gameRow__date"
                aria-label={`Created ${createdLabel}`}
              >
                {createdLabel}
              </div>
            </div>
          </div>
          <div className="gameRow__meta">
            {winnerName ? (
              <span className="gameRow__detail gameRow__winnerDetail">
                <span className="gameRow__winnerIcon" aria-hidden="true">
                  <Trophy
                    size={14}
                    strokeWidth={2.3}
                    aria-hidden="true"
                    color="black"
                  />
                </span>
                <span className="gameRow__winnerLabel">Won by</span>
                <strong>{winnerName}</strong>
              </span>
            ) : null}
            {complete && draw ? (
              <span className="gameRow__detail">
                <span className="gameRow__statusDot" aria-hidden="true" />
                Draw
              </span>
            ) : null}
            {complete && !winner && !draw ? (
              <span className="gameRow__detail">
                <span className="gameRow__statusDot" aria-hidden="true" />
                Completed
              </span>
            ) : null}
            {!complete ? (
              <span className="gameRow__detail">
                <span className="gameRow__statusDot" aria-hidden="true" />
                In progress
              </span>
            ) : null}
            <span className="gameRow__detail">
              <Crosshair size={15} strokeWidth={2.3} aria-hidden="true" />
              <span>
                {game.winCondition === "reach_zero" ? "Start" : "Target"}
              </span>
              <strong>
                {game.winCondition === "reach_zero"
                  ? game.startingScore
                  : game.targetScore}
              </strong>
              <span>
                {(game.winCondition === "reach_zero"
                  ? game.startingScore
                  : game.targetScore) === 1
                  ? "pt"
                  : "pts"}
              </span>
            </span>
            <span
              className="gameRow__detail gameRow__players"
              aria-label={`${
                isTeamsGame ? "Team" : "Player"
              } count ${participantCount}`}
            >
              {isTeamsGame ? (
                <Users size={15} strokeWidth={2.3} aria-hidden="true" />
              ) : (
                <User size={15} strokeWidth={2.3} aria-hidden="true" />
              )}
              {participantCount}{" "}
              {participantCount === 1
                ? isTeamsGame
                  ? "team"
                  : "player"
                : isTeamsGame
                  ? "teams"
                  : "players"}
            </span>
          </div>
        </button>
      </article>
    </div>
  );
}
