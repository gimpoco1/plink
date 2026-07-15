import { Crown } from "lucide-react";
import type { Standing } from "./WinCelebration";
import { FittedPodiumName } from "./WinCelebrationAtoms";
import { StandingAvatar } from "./WinShareParts";
import {
  formatPodiumScore,
  formatTieScore,
  getOrdinalSuffix,
  isTiedRank,
} from "./WinShareCard";

type Props = {
  hidden: boolean;
  isDraw: boolean;
  isTeamGame: boolean;
  podiumStandings: Array<Standing | null>;
  listedStandings: Standing[];
  rankCounts: Map<number, number>;
};

export function WinStandings({
  hidden,
  isDraw,
  isTeamGame,
  podiumStandings,
  listedStandings,
  rankCounts,
}: Props) {
  if (hidden) return null;
  return (
    <section className="winFx__summary" aria-label="Final standings">
      <div className="winFx__summaryTitle">Final standings</div>
      {podiumStandings.length > 0 ? (
        <div
          className={`winFx__podium${
            listedStandings.length > 0 ? " winFx__podium--withList" : ""
          }`}
          aria-label="Top three"
        >
          {podiumStandings.map((entry, index) => (
            <div
              key={entry?.id ?? `empty-podium-${index + 1}`}
              aria-label={
                entry
                  ? `${entry.name}, rank ${entry.rank}, score ${entry.score}`
                  : `No rank ${index + 1} player`
              }
              className={`winFx__podiumSlot winFx__podiumSlot--${index + 1}${
                entry?.isWinner ? " winFx__podiumSlot--winner" : ""
              }${entry ? "" : " winFx__podiumSlot--empty"}`}
            >
              {entry ? (
                <div className="winFx__podiumAvatarWrap">
                  {entry.isWinner ? (
                    <Crown
                      className="winFx__crown"
                      size={30}
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                  ) : null}
                  <StandingAvatar entry={entry} isTeamGame={isTeamGame} />
                  <FittedPodiumName
                    className="winFx__podiumName"
                    name={entry.name}
                  />
                </div>
              ) : null}
              <div className="winFx__podiumBase">
                <div className="winFx__podiumRank">
                  {entry?.rank ?? index + 1}
                  <span className="winFx__podiumRankSuffix">
                    {getOrdinalSuffix(entry?.rank ?? index + 1)}
                  </span>
                </div>
                {entry ? (
                  <div className="winFx__podiumScoreChip">
                    {formatPodiumScore(
                      entry.score,
                      isTiedRank(entry, rankCounts),
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {listedStandings.length > 0 ? (
        <div className="winFx__standings">
          {listedStandings.map((entry) => (
            <div
              key={entry.id}
              className={`winFx__row${entry.isWinner ? " winFx__row--winner" : ""}`}
            >
              <div className="winFx__rowLeft">
                <div className="winFx__rank">#{entry.rank}</div>
                <StandingAvatar entry={entry} isTeamGame={isTeamGame} />
                <div className="winFx__player">
                  <strong>{entry.name}</strong>
                  {entry.isWinner ? <span>Champion</span> : null}
                  {isDraw && entry.rank === 1 ? <span>Draw</span> : null}
                  {isTiedRank(entry, rankCounts) ? (
                    <span>{formatTieScore(entry.score)}</span>
                  ) : null}
                </div>
              </div>
              <div className="winFx__score">{entry.score}</div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
