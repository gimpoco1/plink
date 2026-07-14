import type { CSSProperties } from "react";

type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>;

export function WinCelebrationEffects() {
  return (
    <>
      <div className="winFx__veil" />
      <div className="winFx__burst" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            className="burstRay"
            key={index}
            style={
              {
                "--ray-rotate": `${index * 30}deg`,
                "--ray-delay": `${index * 22 + 90}ms`,
              } as CSSVarStyle
            }
          />
        ))}
      </div>
      <div className="winFx__sparkles" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, index) => (
          <span
            className="sparkle"
            key={index}
            style={
              {
                "--sparkle-x": `${index * 6.25 + 5}%`,
                "--sparkle-y": `${((index * 37) % 70) + 10}%`,
                "--sparkle-delay": `${index * 80 + 220}ms`,
              } as CSSVarStyle
            }
          />
        ))}
      </div>
      <div className="winFx__orbs" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            className="winFx__orb"
            key={index}
            style={
              {
                "--orb-size": `${120 + index * 18}px`,
                "--orb-left": `${8 + index * 14}%`,
                "--orb-top": `${12 + ((index * 11) % 56)}%`,
                "--orb-duration": `${5200 + index * 280}ms`,
                "--orb-delay": `${index * 100}ms`,
              } as CSSVarStyle
            }
          />
        ))}
      </div>
    </>
  );
}

export function WinCelebrationConfetti() {
  return (
    <div className="winFx__confetti" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, index) => (
        <span
          className="confetti"
          key={index}
          style={
            {
              "--confetti-left": `${index * 3.2 + 2}%`,
              "--confetti-rotate": `${index * 13}deg`,
              "--confetti-delay": `${index * 34 + 160}ms`,
              "--confetti-drift": `${(index - 15) * 0.9}px`,
              "--confetti-final-rotate": `${420 + index * 12}deg`,
            } as CSSVarStyle
          }
        />
      ))}
    </div>
  );
}
