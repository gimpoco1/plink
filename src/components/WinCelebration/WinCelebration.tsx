import { useEffect } from "react";
import "./WinCelebration.css";

type Props = {
  winnerName: string;
  onDone: () => void;
};

export function WinCelebration({ winnerName, onDone }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="winFx" role="status" aria-live="polite" aria-label={`${winnerName} wins`}>
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
      <div className="winFx__content">
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
        <div className="winFx__name">{winnerName}</div>
        <div className="winFx__title">Victory</div>
        <div className="winFx__hint">Champion of this round</div>
      </div>
      <div className="winFx__confetti" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <span className="confetti" key={i} style={{ ["--i" as never]: i }} />
        ))}
      </div>
    </div>
  );
}
