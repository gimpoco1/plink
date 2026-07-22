import { Clock3 } from "lucide-react";
import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";
import { avatarStyleFor } from "../../../utils/color";
import { capitalizeFirst, getInitials } from "../../../utils/text";
import type { HistoryTurn } from "../hooks/useGameHistory";

export function HistoryTurnRow({
  turn,
  timeLabel,
}: {
  turn: HistoryTurn;
  timeLabel: string;
  isTeamsGame: boolean;
}) {
  const deltaLabel =
    turn.totalDelta > 0 ? `+${turn.totalDelta}` : String(turn.totalDelta);
  const deltaClass =
    turn.totalDelta >= 0
      ? "historyDelta historyDelta--pos"
      : "historyDelta historyDelta--neg";
  return (
    <article className="historyRow">
      {turn.icon ? (
        <div className="historyAvatar historyAvatar--team" aria-hidden="true">
          <TeamIcon icon={turn.icon} size={16} strokeWidth={2.2} />
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
          <div className="historyInfo__name">
            {capitalizeFirst(turn.subjectName)}
          </div>
          <div className={deltaClass}>{deltaLabel}</div>
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
          {turn.updatedBy ? (
            <span className="historyUpdater">
              <span
                className="historyUpdater__avatar"
                style={avatarStyleFor(turn.updatedBy.avatarColor)}
                aria-hidden="true"
              >
                {getInitials(turn.updatedBy.name)}
              </span>
              <span>
                Updated by{" "}
                {turn.updatedBy.isCurrentUser
                  ? "You"
                  : capitalizeFirst(turn.updatedBy.name)}
              </span>
            </span>
          ) : null}
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
