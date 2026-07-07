import { BarChart3, Flame, GitCompareArrows, Lock, TrendingUp } from "lucide-react";

export function StatsProPreview({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section className="statsPanel statsProPreview">
      <div className="statsProPreview__copy">
        <span className="statsProPreview__badge">
          <Lock size={13} strokeWidth={2.4} aria-hidden="true" />
          Pro stats
        </span>
        <h3>Advanced reports</h3>
        <p>
          Turn your sessions into trends, matchups, streaks, and game-level form.
        </p>
      </div>

      <div className="statsProPreview__mock" aria-hidden="true">
        <div className="statsProPreview__mockHeader">
          <span>Player report</span>
          <strong>Preview</strong>
        </div>
        <div className="statsProPreview__mockStats">
          <span>
            <b>68%</b>
            Win rate
          </span>
          <span>
            <b>5x</b>
            Best streak
          </span>
          <span>
            <b>12</b>
            H2H games
          </span>
        </div>
        <svg
          className="statsProPreview__chart"
          viewBox="0 0 320 92"
          role="img"
          aria-label="Preview chart"
        >
          <g className="statsProPreview__grid">
            <line x1="0" x2="320" y1="18" y2="18" />
            <line x1="0" x2="320" y1="48" y2="48" />
            <line x1="0" x2="320" y1="78" y2="78" />
          </g>
          <g className="statsProPreview__bars">
            <rect x="18" y="58" width="18" height="20" rx="7" />
            <rect x="54" y="46" width="18" height="32" rx="7" />
            <rect x="90" y="35" width="18" height="43" rx="7" />
            <rect x="126" y="28" width="18" height="50" rx="7" />
            <rect x="162" y="38" width="18" height="40" rx="7" />
          </g>
          <path
            className="statsProPreview__area"
            d="M14 70 C48 62 70 60 98 48 S150 28 186 34 S242 54 306 20 L306 86 L14 86 Z"
          />
          <path
            className="statsProPreview__path statsProPreview__path--primary"
            d="M14 70 C48 62 70 60 98 48 S150 28 186 34 S242 54 306 20"
          />
          <path
            className="statsProPreview__path statsProPreview__path--secondary"
            d="M14 74 C52 72 82 75 116 62 S176 50 210 56 S256 68 306 44"
          />
          <circle cx="306" cy="20" r="5" className="statsProPreview__dot" />
        </svg>
      </div>

      <div className="statsProPreview__features">
        <span>
          <TrendingUp size={14} strokeWidth={2.4} aria-hidden="true" />
          Trend charts
        </span>
        <span>
          <BarChart3 size={14} strokeWidth={2.4} aria-hidden="true" />
          Game filters
        </span>
        <span>
          <Flame size={14} strokeWidth={2.4} aria-hidden="true" />
          Streak history
        </span>
        <span>
          <GitCompareArrows size={14} strokeWidth={2.4} aria-hidden="true" />
          Head-to-head
        </span>
      </div>

      <button type="button" onClick={onUpgrade}>
        Unlock reports
      </button>
    </section>
  );
}
