import { useMemo, useState } from "react";
import type { Player, WinCondition } from "../../types";
import { MAX_ABS_SCORE, QUICK_DELTAS } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import {
  capitalizeFirst,
  formatAccountPlayerName,
  getInitials,
} from "../../utils/text";
import { SwipeableCard } from "../SwipeableCard/SwipeableCard";
import "./PlayerCard.css";

type Props = {
  player: Player;
  rank: number;
  showRank: boolean;
  pulse?: "pos" | "neg";
  isWinner?: boolean;
  isAccountPlayer?: boolean;
  targetScore: number;
  startingScore: number;
  winCondition: WinCondition;
  onDelta: (playerId: string, delta: number) => void;
  onDelete: (playerId: string) => void;
};

export function PlayerCard({
  player,
  rank,
  showRank,
  pulse,
  isWinner,
  isAccountPlayer,
  targetScore,
  startingScore,
  winCondition,
  onDelta,
  onDelete,
}: Props) {
  const currentScore =
    typeof player.score === "number" && Number.isFinite(player.score)
      ? player.score
      : startingScore;
  const displayName = isAccountPlayer
    ? formatAccountPlayerName(player.name)
    : capitalizeFirst(player.name);
  const initials = getInitials(player.name);
  const scoreClass =
    currentScore > 0
      ? "score score--pos"
      : currentScore < 0
        ? "score score--neg"
        : "score";
  const [customRaw, setCustomRaw] = useState("");
  const customValue = useMemo(
    () => Number.parseInt(customRaw, 10),
    [customRaw],
  );
  const canApplyCustom =
    Number.isFinite(customValue) && Math.abs(customValue) > 0;
  const progress =
    winCondition === "reach_zero"
      ? Math.min(
          100,
          Math.max(
            0,
            ((startingScore - currentScore) /
              Math.max(1, startingScore - targetScore)) *
              100,
          ),
        )
      : Math.min(
          100,
          Math.max(0, (currentScore / Math.max(1, targetScore)) * 100),
        );

  const negDeltas = QUICK_DELTAS.filter((d) => d < 0).reverse();
  const posDeltas = QUICK_DELTAS.filter((d) => d > 0).reverse();

  return (
    <SwipeableCard
      actionWidth={92}
      cardClassName={`playerCard${
        isWinner
          ? " card--winner"
          : rank === 1 && showRank
            ? " card--leader"
            : ""
      }`}
      renderActions={({ closeSwipe }) => (
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
      )}
    >
      {({ isSwiping, isOpen, closeSwipe }) => (
        <>
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
                <div className="who__nameRow">
                  <div className="who__name">{displayName}</div>
                  {isWinner ? (
                    <div className="winnerMark" aria-label="Winner">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M8 4h8v4.5a4 4 0 0 1-8 0V4Zm0 2H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 12.5V17m-3 3h6m-5-3h4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="cardHeader__right">
              <div
                className={`${scoreClass}${pulse ? ` score--pulse-${pulse}` : ""}`}
                aria-label={`Score ${currentScore}`}
              >
                {currentScore}
              </div>
            </div>
          </div>

          <div
            className="progressContainer"
            role="progressbar"
            aria-label={`${displayName} progress to target`}
            aria-valuemin={0}
            aria-valuemax={
              winCondition === "reach_zero"
                ? startingScore
                : Math.max(1, targetScore)
            }
            aria-valuenow={
              winCondition === "reach_zero"
                ? Math.max(0, startingScore - currentScore)
                : Math.max(0, currentScore)
            }
          >
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
                    aria-label={`Subtract ${Math.abs(delta)} points from ${displayName}`}
                    onClick={(e) => {
                      if (isSwiping) return;
                      if (isOpen) {
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
                  aria-label={`Custom point amount for ${displayName}`}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, "");
                    if (!digits) {
                      setCustomRaw("");
                      return;
                    }

                    setCustomRaw(
                      String(
                        Math.min(MAX_ABS_SCORE, Number.parseInt(digits, 10)),
                      ),
                    );
                  }}
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
                    aria-label={`Subtract custom points from ${displayName}`}
                    type="button"
                    disabled={!canApplyCustom}
                    onClick={(e) => {
                      if (isSwiping) return;
                      if (isOpen) {
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
                    aria-label={`Add custom points to ${displayName}`}
                    type="button"
                    disabled={!canApplyCustom}
                    onClick={(e) => {
                      if (isSwiping) return;
                      if (isOpen) {
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
                    aria-label={`Add ${delta} points to ${displayName}`}
                    onClick={(e) => {
                      if (isSwiping) return;
                      if (isOpen) {
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
        </>
      )}
    </SwipeableCard>
  );
}
