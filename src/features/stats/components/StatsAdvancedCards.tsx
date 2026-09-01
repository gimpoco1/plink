import { translate } from "../../../i18n/translate";
import { Check, CircleX, Lock, Minus, Swords, Trophy } from "lucide-react";
import { STATUS_LABELS } from "../types/statsTypes";
import type {
  HeadToHeadSummary,
  StreakHistorySummary,
  StreakSubjectSummary,
} from "../utils/statsUtils";

type StatsAdvancedCardsProps = {
  activeKind: "players" | "teams";
  streakSummary: StreakHistorySummary | null;
  headToHeadSummary: HeadToHeadSummary | null;
  isLocked: boolean;
  onUpgrade: () => void;
};

export function StatsAdvancedCards({
  activeKind,
  streakSummary,
  headToHeadSummary,
  isLocked,
  onUpgrade,
}: StatsAdvancedCardsProps) {
  const visibleStreakSummary = isLocked ? MOCK_STREAK_SUMMARY : streakSummary;
  const visibleHeadToHeadSummary = isLocked
    ? MOCK_HEAD_TO_HEAD_SUMMARY
    : headToHeadSummary;

  return (
    <div className="statsAdvancedGrid">
      <article
        className={`statsPanel statsAdvancedCard${isLocked ? " statsAdvancedCard--locked" : ""}`}
      >
        <div className="statsAdvancedCard__content">
          <div className="statsPanel__head">
            <h3>{translate("copy.streakHistory")}</h3>
            {isLocked ? <span>{translate("common.pro")}</span> : null}
          </div>
          {visibleStreakSummary ? (
            <div className="statsStreakRows">
              <StreakRow summary={visibleStreakSummary.primary} />
              {visibleStreakSummary.secondary ? (
                <StreakRow summary={visibleStreakSummary.secondary} />
              ) : null}
            </div>
          ) : (
            <p className="emptyMsg">
              {translate("copy.playCompletedSessionsToBuildStreakHistory")}
            </p>
          )}
        </div>
        {isLocked ? (
          <ProOverlay
            onUpgrade={onUpgrade}
            label={translate("copy.unlockStreakHistory")}
          />
        ) : null}
      </article>

      <article
        className={`statsPanel statsAdvancedCard${isLocked ? " statsAdvancedCard--locked" : ""}`}
      >
        <div className="statsAdvancedCard__content">
          <div className="statsPanel__head">
            <h3>{translate("copy.headToHead")}</h3>
            {isLocked ? <span>{translate("common.pro")}</span> : null}
          </div>
          {visibleHeadToHeadSummary ? (
            <div className="statsHeadToHead">
              <div className="statsHeadToHead__score">
                <strong>{visibleHeadToHeadSummary.primaryWins}</strong>
                <span>
                  <Swords size={14} strokeWidth={2.4} aria-hidden="true" />
                  {visibleHeadToHeadSummary.sharedCompleted} {translate("copy.shared2")}
                </span>
                <strong>{visibleHeadToHeadSummary.secondaryWins}</strong>
              </div>
              <div className="statsHeadToHead__names">
                <span>{visibleHeadToHeadSummary.primaryName}</span>
                <span>{visibleHeadToHeadSummary.secondaryName}</span>
              </div>
              <div className="statsHeadToHead__chips">
                <span>{visibleHeadToHeadSummary.draws} {translate("copy.draws2")}</span>
                <span>{visibleHeadToHeadSummary.sharedWins} {translate("copy.together")}</span>
                <span>
                  {visibleHeadToHeadSummary.completedWithoutWinner} {translate("copy.noWinner2")}
                </span>
                <span>{visibleHeadToHeadSummary.inProgress} {translate("copy.live")}</span>
              </div>
            </div>
          ) : (
            <p className="emptyMsg">
              {translate("copy.compareTwo")}{" "}
              {activeKind === "teams" ? translate("copy.teams") : translate("copy.players")} {translate("copy.toSeeTheirSharedSessions")}
            </p>
          )}
        </div>
        {isLocked ? (
          <ProOverlay
            onUpgrade={onUpgrade}
            label={translate("copy.unlockHeadToHead")}
          />
        ) : null}
      </article>
    </div>
  );
}

function StreakRow({ summary }: { summary: StreakSubjectSummary }) {
  return (
    <div className="statsStreakRow">
      <div className="statsStreakRow__name">
        <strong>{summary.name}</strong>
        <span>
          {summary.completed} {translate("copy.completedSession")}
          {summary.completed === 1 ? "" : "s"}
        </span>
      </div>
      <div className="statsStreakRow__metrics">
        <span>
          {translate("copy.current")} <b>{summary.current ? `${summary.current}x` : "—"}</b>
        </span>
        <span>
          {translate("copy.best")} <b>{summary.best ? `${summary.best}x` : "—"}</b>
        </span>
      </div>
      <div className="statsStreakFormWrap">
        {summary.form.length ? (
          <span className="statsStreakFormWrap__label">
            {translate("copy.last")} {summary.form.length} {translate("copy.completedNewestRight")}
          </span>
        ) : null}
        <div
          className="statsStreakForm"
          aria-label={translate("dynamic.recentForm", [summary.name])}
        >
          {summary.form.length ? (
            summary.form.map((status, index) => (
              <span
                key={`${status}-${index}`}
                className={`statsStreakForm__chip statsStreakForm__chip--${status}`}
                title={STATUS_LABELS[status]}
              >
                <StreakStatusIcon status={status} />
              </span>
            ))
          ) : (
            <span className="statsStreakForm__empty">
              {translate("copy.noFormYet")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StreakStatusIcon({
  status,
}: {
  status: StreakSubjectSummary["form"][number];
}) {
  switch (status) {
    case "won":
      return <Trophy size={13} strokeWidth={2.6} aria-hidden="true" />;
    case "lost":
      return <CircleX size={14} strokeWidth={2.6} aria-hidden="true" />;
    case "draw":
      return <Minus size={14} strokeWidth={2.8} aria-hidden="true" />;
    case "completed":
    default:
      return <Check size={13} strokeWidth={2.8} aria-hidden="true" />;
  }
}

function ProOverlay({
  label,
  onUpgrade,
}: {
  label: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="statsAdvancedLock">
      <span>
        <Lock size={13} strokeWidth={2.4} aria-hidden="true" />
        {translate("copy.proCharts")}
      </span>
      <button type="button" onClick={onUpgrade}>
        {label}
      </button>
    </div>
  );
}

const MOCK_STREAK_SUMMARY: StreakHistorySummary = {
  primary: {
    name: "You",
    current: 4,
    best: 7,
    completed: 18,
    form: ["won", "won", "lost", "won", "draw", "won"],
  },
  secondary: {
    name: "Rival",
    current: 2,
    best: 5,
    completed: 16,
    form: ["lost", "won", "won", "completed", "won", "lost"],
  },
};

const MOCK_HEAD_TO_HEAD_SUMMARY: HeadToHeadSummary = {
  primaryName: "You",
  secondaryName: "Rival",
  sharedCompleted: 12,
  inProgress: 1,
  primaryWins: 7,
  secondaryWins: 4,
  draws: 1,
  sharedWins: 2,
  completedWithoutWinner: 0,
};
