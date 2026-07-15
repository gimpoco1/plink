import { useMemo, useState } from "react";
import type { Player, WinCondition } from "../../types";
import { MAX_ABS_SCORE, QUICK_DELTAS } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import { TeamIcon } from "../TeamIcon/TeamIcon";
import { Trophy } from "lucide-react";
import "./TeamScoreCard.css";

type Props = {
  id: string;
  name: string;
  icon?: string;
  members: Player[];
  rank: number;
  showRank: boolean;
  pulse?: "pos" | "neg";
  isWinner?: boolean;
  targetScore: number;
  startingScore: number;
  winCondition: WinCondition;
  onDelta: (id: string, delta: number) => void;
};

export function TeamScoreCard({
  id,
  name,
  icon,
  members,
  rank,
  showRank,
  pulse,
  isWinner,
  targetScore,
  startingScore,
  winCondition,
  onDelta,
}: Props) {
  const currentScore =
    typeof members[0]?.score === "number" && Number.isFinite(members[0].score)
      ? members[0].score
      : startingScore;
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
  const negDeltas = QUICK_DELTAS.filter((delta) => delta < 0).reverse();
  const posDeltas = QUICK_DELTAS.filter((delta) => delta > 0).reverse();
  const overflowCount = Math.max(0, members.length - 5);

  return (
    <div
      className={`card playerCard teamScoreCard${
        isWinner
          ? " card--winner"
          : rank === 1 && showRank
            ? " card--leader"
            : ""
      }`}
    >
      <div className="cardHeader">
        <div className="cardHeader__left">
          {showRank ? (
            <div className="rank" aria-label={`Rank ${rank}`}>
              #{rank}
            </div>
          ) : null}
          <div className="avatar teamScoreCard__teamIcon" aria-hidden="true">
            <TeamIcon icon={icon} size={28} strokeWidth={2.35} />
          </div>
          <div className="teamScoreCard__identity">
            <div className="who">
              <div className="who__nameRow">
                <div className="who__name">{name}</div>
              </div>
              <div
                className="teamScoreCard__membersCompact"
                aria-label={`${name} members`}
              >
                {members.slice(0, 5).map((member) => (
                  <span
                    key={`${id}:${member.id}`}
                    className="teamScoreCard__memberAvatar"
                    style={avatarStyleFor(member.avatarColor)}
                    title={member.name}
                    aria-label={member.name}
                  >
                    {getInitials(member.name)}
                  </span>
                ))}
                {overflowCount > 0 ? (
                  <span
                    className="teamScoreCard__memberOverflow"
                    aria-label={`${overflowCount} more members`}
                  >
                    +{overflowCount}
                  </span>
                ) : null}
              </div>
            </div>
            {isWinner ? (
              <div className="winnerMark" aria-label="Winner">
                <Trophy size={24} strokeWidth={2.2} aria-hidden="true" />
              </div>
            ) : null}
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
        aria-label={`${name} progress to target`}
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
                aria-label={`Subtract ${Math.abs(delta)} points from ${name}`}
                onClick={() => onDelta(id, delta)}
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
              aria-label={`Custom point amount for ${name}`}
              onChange={(event) => {
                const digits = event.target.value.replace(/[^\d]/g, "");
                if (!digits) {
                  setCustomRaw("");
                  return;
                }
                setCustomRaw(
                  String(Math.min(MAX_ABS_SCORE, Number.parseInt(digits, 10))),
                );
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canApplyCustom) {
                  onDelta(id, Math.abs(customValue));
                  setCustomRaw("");
                }
              }}
            />
            <div className="podButtons">
              <button
                className="podBtn podBtn--neg"
                aria-label={`Subtract custom points from ${name}`}
                type="button"
                disabled={!canApplyCustom}
                onClick={() => {
                  onDelta(id, -Math.abs(customValue));
                  setCustomRaw("");
                }}
              >
                −
              </button>
              <button
                className="podBtn podBtn--pos"
                aria-label={`Add custom points to ${name}`}
                type="button"
                disabled={!canApplyCustom}
                onClick={() => {
                  onDelta(id, Math.abs(customValue));
                  setCustomRaw("");
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
                aria-label={`Add ${delta} points to ${name}`}
                onClick={() => onDelta(id, delta)}
              >
                +{delta}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
