import type { RefObject } from "react";
import { Crown, Target } from "lucide-react";
import type { ProfileStats, TeamStats } from "../../utils/profileStats";
import type { Standing } from "./WinCelebration";
import { ShareAvatar, ShareStat } from "./WinShareParts";
import { FittedPodiumName } from "./WinCelebrationAtoms";

export function buildWinShareText({
  gameName,
  winnerName,
  targetLabel,
  isTeamGame,
  winnerStats,
  standings,
}: {
  gameName: string;
  winnerName: string;
  targetLabel: string;
  isTeamGame: boolean;
  winnerStats: ProfileStats | TeamStats | null;
  standings: Standing[];
}) {
  const winnerStanding =
    standings.find((entry) => entry.isWinner) ?? standings[0] ?? null;
  const subject = isTeamGame ? "team" : "player";
  const lines = [
    `${winnerName} just won ${gameName}.`,
    targetLabel,
    winnerStanding ? `Winning ${subject} score: ${winnerStanding.score}` : null,
    winnerStats
      ? `Updated stats: ${winnerStats.wins} win${
          winnerStats.wins === 1 ? "" : "s"
        } · ${winnerStats.completedGames > 0 ? `${winnerStats.winRate}%` : "—"} win rate${
          winnerStats.currentWinStreak > 1
            ? ` · ${winnerStats.currentWinStreak}x streak`
            : ""
        }`
      : null,
    standings.length > 1
      ? `Final standings: ${standings
          .slice(0, 3)
          .map((entry) => `#${entry.rank} ${entry.name} (${entry.score})`)
          .join(" · ")}`
      : null,
    "Sent from Plink.",
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export function getRankCounts(standings: Standing[]) {
  return standings.reduce((counts, entry) => {
    counts.set(entry.rank, (counts.get(entry.rank) ?? 0) + 1);
    return counts;
  }, new Map<number, number>());
}

export function isTiedRank(entry: Standing, rankCounts: Map<number, number>) {
  return (rankCounts.get(entry.rank) ?? 0) > 1;
}

export function formatTieScore(score: number) {
  return `Tied · ${formatScore(score)}`;
}

export function formatPodiumScore(score: number, isTied: boolean) {
  return isTied ? formatTieScore(score) : formatScore(score);
}

function formatScore(score: number) {
  return `${score} pt${Math.abs(score) === 1 ? "" : "s"}`;
}

export function formatStatsSnapshotDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function getOrdinalSuffix(rank: number) {
  const absoluteRank = Math.abs(rank);
  const tens = absoluteRank % 100;
  if (tens >= 11 && tens <= 13) return "th";

  switch (absoluteRank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function WinShareCard({
  cardRef,
  gameName,
  winnerName,
  targetLabel,
  completedAt,
  isTeamGame,
  winnerStats,
  standings,
}: {
  cardRef: RefObject<HTMLDivElement>;
  gameName: string;
  winnerName: string;
  targetLabel: string;
  completedAt: number;
  isTeamGame: boolean;
  winnerStats: ProfileStats | TeamStats | null;
  standings: Standing[];
}) {
  const shareDate = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(completedAt));
  const winnerStanding =
    standings.find((entry) => entry.isWinner) ?? standings[0] ?? null;
  const rankCounts = getRankCounts(standings);
  const podiumEntries = [standings[1], standings[0], standings[2]];
  const lowerStandings = standings.slice(3);

  return (
    <div className="winShareRenderHost" aria-hidden="true">
      <div
        ref={cardRef}
        className={`winShareCard${isTeamGame ? " winShareCard--teams" : ""}`}
      >
        <div className="winShareCard__shell">
          <header className="winShareCard__hero">
            <div className="winShareCard__meta">
              <span>Winner</span>
            </div>
            <h1>{winnerName}</h1>
            <div className="winShareCard__sessionMeta">
              <span className="winShareCard__sessionGame">{gameName}</span>
              <span
                className="winShareCard__sessionDivider"
                aria-hidden="true"
              />
              <Target size={14} strokeWidth={2.5} aria-hidden="true" />
              <span>{targetLabel}</span>
            </div>
          </header>

          <div className="winShareCard__stats">
            <ShareStat
              value={String(winnerStats?.wins ?? "—")}
              label={isTeamGame ? "Team wins" : "Total wins"}
            />
            <ShareStat
              value={
                winnerStats?.completedGames ? `${winnerStats.winRate}%` : "—"
              }
              label="Win rate"
              accent
            />
            <ShareStat
              value={
                (winnerStats?.currentWinStreak ?? 0) > 1
                  ? `${winnerStats?.currentWinStreak}x`
                  : "—"
              }
              label="Win streak"
            />
          </div>

          <section className="winShareCard__standings">
            <h2>Final standings</h2>
            <div className="winSharePodium">
              {podiumEntries.map((entry, index) => {
                const slotRank = index === 0 ? 2 : index === 1 ? 1 : 3;
                const isTied = entry ? isTiedRank(entry, rankCounts) : false;
                return (
                  <div
                    key={entry?.id ?? `share-empty-${slotRank}`}
                    className={`winSharePodium__slot winSharePodium__slot--${slotRank}${
                      slotRank === 1 ? " winSharePodium__slot--winner" : ""
                    }${entry ? "" : " winSharePodium__slot--empty"}`}
                  >
                    {entry ? (
                      <div className="winSharePodium__avatarWrap">
                        {entry.rank === 1 ? (
                          <Crown
                            className="winSharePodium__crown"
                            size={30}
                            strokeWidth={2.3}
                            aria-hidden="true"
                          />
                        ) : null}
                        <ShareAvatar entry={entry} isTeamGame={isTeamGame} />
                        <FittedPodiumName
                          className="winSharePodium__name"
                          name={entry.name}
                        />
                      </div>
                    ) : null}
                    <div className="winSharePodium__base">
                      <div className="winSharePodium__rank">
                        <span className="winSharePodium__rankNumber">
                          {entry?.rank ?? slotRank}
                        </span>
                        <span className="winSharePodium__rankSuffix">
                          {getOrdinalSuffix(entry?.rank ?? slotRank)}
                        </span>
                      </div>
                      {entry ? (
                        <div className="winSharePodium__scoreChip">
                          {formatPodiumScore(entry.score, isTied)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {lowerStandings.length ? (
              <div className="winShareList">
                <div className="winShareList__grid">
                  {lowerStandings.map((entry) => (
                    <div key={entry.id} className="winShareList__row">
                      <span className="winShareList__rank">#{entry.rank}</span>
                      <ShareAvatar
                        entry={entry}
                        isTeamGame={isTeamGame}
                        compact
                      />
                      <strong>{entry.name}</strong>
                      <b>{entry.score}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <footer className="winShareCard__footer">
            <div>
              <span>Winning score</span>
              <strong>{winnerStanding?.score ?? "—"}</strong>
            </div>
            <div>
              <span>Date</span>
              <strong>{shareDate}</strong>
            </div>
            <div>
              <span>Sent from</span>
              <strong>Plink</strong>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
