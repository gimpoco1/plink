import type { ProfileStats, TeamStats } from "../../utils/profileStats";
import type { WinCondition } from "../../types";
import { Medal, Share2, Target } from "lucide-react";
import { useWinCelebrationModel } from "./useWinCelebrationModel";
import { WinShareCard } from "./WinShareCard";
import { WinStandings } from "./WinStandings";
import {
  WinCelebrationConfetti,
  WinCelebrationEffects,
} from "./WinCelebrationEffects";
import "./WinCelebration.css";

export type Standing = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  icon?: string;
  score: number;
  rank: number;
  isWinner: boolean;
};

export type ShareStatus = "idle" | "preparing" | "copied" | "error";

export type WinCelebrationProps = {
  isTeamGame?: boolean;
  winnerName?: string | null;
  resultKind?: "winner" | "draw" | "completed";
  gameName: string;
  targetScore: number;
  startingScore: number;
  winCondition: WinCondition;
  winByTwo: boolean;
  manualEndOnly: boolean;
  completedAt: number;
  winnerStats: ProfileStats | TeamStats | null;
  isLatestCompletedGame: boolean;
  standings: Standing[];
  onDismiss: () => void;
  onReplay: () => void;
  onBackToHome: () => void;
};

export function WinCelebration(props: WinCelebrationProps) {
  const {
    shareStatus,
    setShareStatus,
    shareCardRef,
    isDraw,
    isCompletedWithoutWinner,
    isSingleParticipantCompletion,
    podiumStandings,
    listedStandings,
    rankCounts,
    statsLabels,
    resultHint,
    targetLabel,
    heroWinStreak,
    statsBadgeDate,
    winnerStanding,
    canShareWin,
    shareText,
    handleShareWin,
    dialogLabel,
    ...viewProps
  } = useWinCelebrationModel(props);
  const {
    isTeamGame,
    winnerName,
    gameName,
    completedAt,
    winnerStats,
    standings,
    onDismiss,
    onReplay,
    onBackToHome,
  } = viewProps;
  return (
    <div
      className={`winFx${isTeamGame ? " winFx--teams" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
    >
      <WinCelebrationEffects />

      <div className="winFx__content">
        <div className="winFx__hero">
          <div className="winFx__halo" aria-hidden="true" />
          <div className="winFx__medal" aria-hidden="true">
            <Medal size={28} strokeWidth={2.25} />
          </div>
          <div className="winFx__eyebrow">
            {isDraw
              ? "Draw"
              : isCompletedWithoutWinner || isSingleParticipantCompletion
                ? "Finished"
                : "Winner"}
          </div>
          <div className="winFx__name">
            {isDraw
              ? "Draw game"
              : isCompletedWithoutWinner
                ? "No winner"
                : winnerName}
          </div>
          <div className="winFx__titleBlock">
            <div className="winFx__sessionMeta">
              <span className="winFx__sessionGame">{gameName}</span>
              <span className="winFx__sessionDivider" aria-hidden="true" />
              <Target size={13} strokeWidth={2.5} aria-hidden="true" />
              <span>{targetLabel}</span>
            </div>
          </div>
          {heroWinStreak ? (
            <div className="winFx__heroMeta">
              <div
                className="winFx__streakHero"
                aria-label={`${heroWinStreak} ${statsLabels.streak.toLowerCase()}`}
              >
                <span className="winFx__streakHeroCount">{heroWinStreak}</span>
                <span className="winFx__streakHeroLabel">
                  {statsLabels.streak}
                </span>
              </div>
            </div>
          ) : null}
          {!isDraw &&
          (isCompletedWithoutWinner || !winnerStats?.currentWinStreak) ? (
            <div className="winFx__hint">
              <Target size={14} strokeWidth={2.4} aria-hidden="true" />
              <span>{resultHint}</span>
            </div>
          ) : null}
        </div>
        <WinStandings
          hidden={Boolean(isSingleParticipantCompletion)}
          isDraw={isDraw}
          isTeamGame={Boolean(isTeamGame)}
          podiumStandings={podiumStandings}
          listedStandings={listedStandings}
          rankCounts={rankCounts}
        />
        {!isDraw && !isCompletedWithoutWinner && winnerStats ? (
          <section className="winFx__playerStats" aria-label={statsLabels.aria}>
            <div className="winFx__playerStatsHeader">
              <div className="winFx__playerStatsTitle">{statsLabels.title}</div>
              <div className="winFx__playerStatsBadge">
                {statsBadgeDate ? (
                  <>
                    <span className="winFx__playerStatsBadgeLabel">
                      Last updated:
                    </span>
                    <span>{statsBadgeDate}</span>
                  </>
                ) : (
                  "Latest"
                )}
              </div>
            </div>
            <div className="winFx__playerStatsGrid">
              <div className="winFx__playerStat">
                <strong>{winnerStats.wins}</strong>
                <span>{statsLabels.total}</span>
              </div>
              <div className="winFx__playerStat">
                <strong>
                  {winnerStats.completedGames > 0
                    ? `${winnerStats.winRate}%`
                    : "—"}
                </strong>
                <span>{statsLabels.rate}</span>
              </div>
              <div className="winFx__playerStat">
                <strong>{winnerStats.gamesPlayed}</strong>
                <span>Sessions</span>
              </div>
              <div className="winFx__playerStat">
                <strong>{winnerStats.topWonGame?.name ?? "—"}</strong>
                <span>Top game</span>
              </div>
            </div>
          </section>
        ) : null}

        <div className="winFx__actions">
          {canShareWin ? (
            <button
              type="button"
              className="winFx__btn winFx__btn--share"
              onClick={handleShareWin}
              disabled={shareStatus === "preparing"}
            >
              <Share2 size={18} strokeWidth={2.5} aria-hidden="true" />
              <span>
                {shareStatus === "preparing"
                  ? "Creating card"
                  : shareStatus === "copied"
                    ? "Copied"
                    : shareStatus === "error"
                      ? "Share failed"
                      : "Share win"}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="winFx__btn winFx__btn--ghost"
            onClick={onDismiss}
          >
            Continue
          </button>
          <button
            type="button"
            className="winFx__btn winFx__btn--ghost"
            onClick={onBackToHome}
          >
            Back to sessions
          </button>
          <button
            type="button"
            className="winFx__btn winFx__btn--primary"
            onClick={onReplay}
          >
            Play again
          </button>
        </div>
      </div>

      <WinCelebrationConfetti />
      {Boolean(canShareWin) ? (
        <WinShareCard
          cardRef={shareCardRef}
          gameName={gameName}
          winnerName={winnerName ?? winnerStanding?.name ?? "Winner"}
          targetLabel={targetLabel}
          completedAt={completedAt}
          isTeamGame={Boolean(isTeamGame)}
          winnerStats={winnerStats}
          standings={standings}
        />
      ) : null}
    </div>
  );
}
