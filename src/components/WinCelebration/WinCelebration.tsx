import { useEffect } from "react";
import { DEFAULT_TEAM_ICON } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import type { ProfileStats } from "../../utils/profileStats";
import type { WinCondition } from "../../types";
import {
  Dumbbell,
  Flag,
  Flame,
  Shield,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import "./WinCelebration.css";

type Standing = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  icon?: string;
  score: number;
  rank: number;
  isWinner: boolean;
};

const TEAM_ICON_COMPONENTS = {
  dumbbell: Dumbbell,
  trophy: Trophy,
  shield: Shield,
  flag: Flag,
  target: Target,
  zap: Zap,
  flame: Flame,
  star: Star,
} as const;

type Props = {
  isTeamGame?: boolean;
  winnerName?: string | null;
  isDraw?: boolean;
  gameName: string;
  targetScore: number;
  startingScore: number;
  winCondition: WinCondition;
  manualEndOnly: boolean;
  winnerStats: ProfileStats | null;
  standings: Standing[];
  onDismiss: () => void;
  onReplay: () => void;
  onBackToHome: () => void;
};

export function WinCelebration({
  isTeamGame = false,
  winnerName,
  isDraw = false,
  gameName,
  targetScore,
  startingScore,
  winCondition,
  manualEndOnly,
  winnerStats,
  standings,
  onDismiss,
  onReplay,
  onBackToHome,
}: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className={`winFx${isTeamGame ? " winFx--teams" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={isDraw ? `${gameName} ended in a draw` : `${winnerName} wins ${gameName}`}
    >
      <div className="winFx__veil" />
      <div className="winFx__burst" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span className="burstRay" key={i} style={{ ["--i" as never]: i }} />
        ))}
      </div>
      <div className="winFx__sparkles" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span className="sparkle" key={i} style={{ ["--i" as never]: i }} />
        ))}
      </div>
      <div className="winFx__orbs" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span className="winFx__orb" key={i} style={{ ["--i" as never]: i }} />
        ))}
      </div>

      <div className="winFx__content">
        <div className="winFx__hero">
          <div className="winFx__halo" aria-hidden="true" />
          <div className="winFx__medal" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="m7 3 3 5m7-5-3 5m-2 0-2 4.5 2 1.5 2-1.5L12 8Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="16.2" r="4.2" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="m10.7 16.3.9 1 1.8-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="winFx__eyebrow">{isDraw ? "Draw" : "Winner"}</div>
          <div className="winFx__name">{isDraw ? "Draw game" : winnerName}</div>
          {!isDraw && winnerStats?.currentWinStreak ? (
            <div className="winFx__streakHero" aria-label={`${winnerStats.currentWinStreak} win streak`}>
              <span className="winFx__streakHeroCount">
                {winnerStats.currentWinStreak}
              </span>
              <span className="winFx__streakHeroLabel">Win streak</span>
            </div>
          ) : (
            <div className="winFx__title">{gameName}</div>
          )}
          {!isDraw ? (
            <div className="winFx__hint">
              {manualEndOnly
                ? "Ended manually"
                : winCondition === "reach_zero"
                ? `Started at ${startingScore}, reached 0`
                : winCondition === "lowest"
                  ? "Lowest score wins"
                  : `Target ${targetScore} points`}
            </div>
          ) : null}
        </div>

        {!isDraw && winnerStats ? (
          <section className="winFx__playerStats" aria-label="Updated winner stats">
            <div className="winFx__playerStatsHeader">
              <div className="winFx__playerStatsTitle">Updated player stats</div>
            </div>
            <div className="winFx__playerStatsGrid">
              <div className="winFx__playerStat">
                <span>Total wins</span>
                <strong>{winnerStats.wins}</strong>
              </div>
              <div className="winFx__playerStat">
                <span>Win rate</span>
                <strong>{winnerStats.completedGames > 0 ? `${winnerStats.winRate}%` : "—"}</strong>
              </div>
              <div className="winFx__playerStat">
                <span>Sessions</span>
                <strong>{winnerStats.gamesPlayed}</strong>
              </div>
              <div className="winFx__playerStat">
                <span>Top game</span>
                <strong>{winnerStats.topWonGame?.name ?? "—"}</strong>
              </div>
            </div>
          </section>
        ) : null}

        <section className="winFx__summary" aria-label="Final standings">
          <div className="winFx__summaryTitle">Final standings</div>
          <div className="winFx__standings">
            {standings.map((entry) => (
              <div
                key={entry.id}
                className={`winFx__row${entry.isWinner ? " winFx__row--winner" : ""}`}
              >
                <div className="winFx__rowLeft">
                  <div className="winFx__rank">#{entry.rank}</div>
                  {isTeamGame && entry.icon ? (
                    <div className="winFx__avatar winFx__avatar--team" aria-hidden="true">
                      <TeamIconGlyph icon={entry.icon} />
                    </div>
                  ) : (
                    <div
                      className="winFx__avatar"
                      style={avatarStyleFor(entry.avatarColor)}
                      aria-hidden="true"
                    >
                      {entry.initials}
                    </div>
                  )}
                  <div className="winFx__player">
                    <strong>{entry.name}</strong>
                    {entry.isWinner ? <span>Champion</span> : null}
                    {isDraw && entry.rank === 1 ? <span>Draw</span> : null}
                  </div>
                </div>
                <div className="winFx__score">{entry.score}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="winFx__actions">
          <button type="button" className="winFx__btn winFx__btn--ghost" onClick={onDismiss}>
            Continue
          </button>
          <button type="button" className="winFx__btn winFx__btn--ghost" onClick={onBackToHome}>
            Back to sessions
          </button>
          <button type="button" className="winFx__btn winFx__btn--primary" onClick={onReplay}>
            Play again
          </button>
        </div>
      </div>

      <div className="winFx__confetti" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <span className="confetti" key={i} style={{ ["--i" as never]: i }} />
        ))}
      </div>
    </div>
  );
}

function TeamIconGlyph({ icon }: { icon?: string }) {
  const Icon =
    TEAM_ICON_COMPONENTS[
      (icon ?? DEFAULT_TEAM_ICON) as keyof typeof TEAM_ICON_COMPONENTS
    ] ?? Dumbbell;
  return <Icon size={18} strokeWidth={2.25} aria-hidden="true" />;
}
