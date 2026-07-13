import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { toBlob } from "html-to-image";
import { DEFAULT_TEAM_ICON } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import type { ProfileStats, TeamStats } from "../../utils/profileStats";
import type { WinCondition } from "../../types";
import {
  Crown,
  Dumbbell,
  Flag,
  Flame,
  Medal,
  Check,
  Share2,
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

type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>;

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

type ShareStatus = "idle" | "preparing" | "copied" | "error";

type Props = {
  isTeamGame?: boolean;
  winnerName?: string | null;
  resultKind?: "winner" | "draw" | "completed";
  gameName: string;
  targetScore: number;
  startingScore: number;
  winCondition: WinCondition;
  manualEndOnly: boolean;
  winnerStats: ProfileStats | TeamStats | null;
  standings: Standing[];
  onDismiss: () => void;
  onReplay: () => void;
  onBackToHome: () => void;
};

export function WinCelebration({
  isTeamGame = false,
  winnerName,
  resultKind = "winner",
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
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("winFx-scrollLock");
    return () => document.body.classList.remove("winFx-scrollLock");
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  const isDraw = resultKind === "draw";
  const isCompletedWithoutWinner = resultKind === "completed";
  const isSingleParticipantCompletion =
    resultKind === "winner" && standings.length === 1;
  const podiumStandings = [standings[0], standings[1], standings[2]];
  const listedStandings = standings.slice(3);
  const statsLabels = isSingleParticipantCompletion && !isTeamGame
    ? {
        title: "Player stats",
        total: "Total wins",
        rate: "Win rate",
        streak: "Win streak",
        aria: "Updated player stats",
      }
    : isTeamGame
      ? {
          title: "Team stats",
          total: "Team wins",
          rate: "Win rate",
          streak: "Win streak",
          aria: "Updated team stats",
        }
    : {
        title: "Winner stats",
        total: "Total wins",
        rate: "Win rate",
        streak: "Win streak",
        aria: "Updated winner stats",
      };
  const resultHint = isSingleParticipantCompletion
    ? "Session completed"
    : isCompletedWithoutWinner
      ? "Ended without a winner"
      : manualEndOnly
        ? "Ended manually"
        : winCondition === "reach_zero"
          ? `Started at ${startingScore}, reached 0`
          : winCondition === "lowest"
            ? "Lowest score wins"
            : `Target ${targetScore} points`;
  const heroWinStreak =
    !isDraw &&
    !isCompletedWithoutWinner &&
    !isSingleParticipantCompletion &&
    (winnerStats?.currentWinStreak ?? 0) > 1
      ? winnerStats?.currentWinStreak ?? 0
      : 0;
  const winnerStanding =
    standings.find((entry) => entry.isWinner) ?? standings[0] ?? null;
  const canShareWin =
    !isDraw &&
    !isCompletedWithoutWinner &&
    !isSingleParticipantCompletion &&
    Boolean(winnerName || winnerStanding);
  const shareTitle = `${winnerName ?? winnerStanding?.name ?? "Winner"} won ${gameName}`;
  const shareText = canShareWin
    ? buildWinShareText({
        gameName,
        winnerName: winnerName ?? winnerStanding?.name ?? "Winner",
        isTeamGame,
        winnerStats,
        standings,
      })
    : "";
  const dialogLabel = isDraw
    ? `${gameName} ended in a draw`
    : isCompletedWithoutWinner
      ? `${gameName} ended without a winner`
      : isSingleParticipantCompletion
        ? `${gameName} completed by ${winnerName}`
      : `${winnerName} wins ${gameName}`;

  async function handleShareWin() {
    if (!shareText) return;

    setShareStatus("preparing");
    try {
      await document.fonts?.ready;
      const imageBlob = shareCardRef.current
        ? await toBlob(shareCardRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "#061013",
          })
        : null;
      const imageFile = imageBlob
        ? new File([imageBlob], `${toShareFileName(gameName)}-win-card.png`, {
            type: "image/png",
          })
        : null;

      if (
        imageFile &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [imageFile] })
      ) {
        await navigator.share({
          files: [imageFile],
        });
        setShareStatus("idle");
        return;
      }

      if (typeof navigator.share === "function") {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        setShareStatus("idle");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setShareStatus("error");
      window.setTimeout(() => setShareStatus("idle"), 2200);
    }
  }

  return (
    <div
      className={`winFx${isTeamGame ? " winFx--teams" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
    >
      <div className="winFx__veil" />
      <div className="winFx__burst" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            className="burstRay"
            key={i}
            style={
              {
                "--ray-rotate": `${i * 30}deg`,
                "--ray-delay": `${i * 22 + 90}ms`,
              } as CSSVarStyle
            }
          />
        ))}
      </div>
      <div className="winFx__sparkles" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            className="sparkle"
            key={i}
            style={
              {
                "--sparkle-x": `${i * 6.25 + 5}%`,
                "--sparkle-y": `${((i * 37) % 70) + 10}%`,
                "--sparkle-delay": `${i * 80 + 220}ms`,
              } as CSSVarStyle
            }
          />
        ))}
      </div>
      <div className="winFx__orbs" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            className="winFx__orb"
            key={i}
            style={
              {
                "--orb-size": `${120 + i * 18}px`,
                "--orb-left": `${8 + i * 14}%`,
                "--orb-top": `${12 + ((i * 11) % 56)}%`,
                "--orb-duration": `${5200 + i * 280}ms`,
                "--orb-delay": `${i * 100}ms`,
              } as CSSVarStyle
            }
          />
        ))}
      </div>

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
          {heroWinStreak ? (
            <div className="winFx__heroMeta">
              <div
                className="winFx__streakHero"
                aria-label={`${heroWinStreak} ${statsLabels.streak.toLowerCase()}`}
              >
                <span className="winFx__streakHeroCount">
                  {heroWinStreak}
                </span>
                <span className="winFx__streakHeroLabel">
                  {statsLabels.streak}
                </span>
              </div>
              <div className="winFx__hint">
                <Target size={14} strokeWidth={2.4} aria-hidden="true" />
                <span>{resultHint}</span>
              </div>
            </div>
          ) : (
            <div className="winFx__title">{gameName}</div>
          )}
          {!isDraw && (isCompletedWithoutWinner || !winnerStats?.currentWinStreak) ? (
            <div className="winFx__hint">
              <Target size={14} strokeWidth={2.4} aria-hidden="true" />
              <span>{resultHint}</span>
            </div>
          ) : null}
        </div>

        {!isDraw && !isCompletedWithoutWinner && winnerStats ? (
          <section className="winFx__playerStats" aria-label={statsLabels.aria}>
            <div className="winFx__playerStatsHeader">
              <div className="winFx__playerStatsTitle">{statsLabels.title}</div>
              <div className="winFx__playerStatsBadge">Updated</div>
            </div>
            <div className="winFx__playerStatsGrid">
              <div className="winFx__playerStat">
                <strong>{winnerStats.wins}</strong>
                <span>{statsLabels.total}</span>
              </div>
              <div className="winFx__playerStat">
                <strong>{winnerStats.completedGames > 0 ? `${winnerStats.winRate}%` : "—"}</strong>
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

        {!isSingleParticipantCompletion ? (
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
                    }${
                      entry ? "" : " winFx__podiumSlot--empty"
                    }`}
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
                      </div>
                    ) : null}
                    <div className="winFx__podiumBase">
                      <div className="winFx__podiumRank">
                        {entry?.rank ?? index + 1}
                      </div>
                      {entry ? (
                        <div className="winFx__podiumName">{entry.name}</div>
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
                      </div>
                    </div>
                    <div className="winFx__score">{entry.score}</div>
                  </div>
                ))}
              </div>
            ) : null}
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
              {shareStatus === "copied" ? (
                <Check size={17} strokeWidth={2.6} aria-hidden="true" />
              ) : (
                <Share2 size={17} strokeWidth={2.6} aria-hidden="true" />
              )}
              <span>
                {shareStatus === "copied"
                  ? "Copied win"
                  : shareStatus === "preparing"
                    ? "Creating card"
                  : shareStatus === "error"
                    ? "Share failed"
                    : "Share win"}
              </span>
            </button>
          ) : null}
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
          <span
            className="confetti"
            key={i}
            style={
              {
                "--confetti-left": `${i * 3.2 + 2}%`,
                "--confetti-rotate": `${i * 13}deg`,
                "--confetti-delay": `${i * 34 + 160}ms`,
                "--confetti-drift": `${(i - 15) * 0.9}px`,
                "--confetti-final-rotate": `${420 + i * 12}deg`,
              } as CSSVarStyle
            }
          />
        ))}
      </div>
      {canShareWin ? (
        <WinShareCard
          cardRef={shareCardRef}
          gameName={gameName}
          winnerName={winnerName ?? winnerStanding?.name ?? "Winner"}
          isTeamGame={isTeamGame}
          winnerStats={winnerStats}
          standings={standings}
        />
      ) : null}
    </div>
  );
}

function buildWinShareText({
  gameName,
  winnerName,
  isTeamGame,
  winnerStats,
  standings,
}: {
  gameName: string;
  winnerName: string;
  isTeamGame: boolean;
  winnerStats: ProfileStats | TeamStats | null;
  standings: Standing[];
}) {
  const winnerStanding =
    standings.find((entry) => entry.isWinner) ?? standings[0] ?? null;
  const subject = isTeamGame ? "team" : "player";
  const lines = [
    `${winnerName} just won ${gameName}.`,
    winnerStanding
      ? `Winning ${subject} score: ${winnerStanding.score}`
      : null,
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

function WinShareCard({
  cardRef,
  gameName,
  winnerName,
  isTeamGame,
  winnerStats,
  standings,
}: {
  cardRef: RefObject<HTMLDivElement>;
  gameName: string;
  winnerName: string;
  isTeamGame: boolean;
  winnerStats: ProfileStats | TeamStats | null;
  standings: Standing[];
}) {
  const shareDate = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const winnerStanding =
    standings.find((entry) => entry.isWinner) ?? standings[0] ?? null;
  const podiumEntries = [2, 1, 3].map(
    (rank) => standings.find((entry) => entry.rank === rank) ?? null,
  );
  const lowerStandings = standings.filter((entry) => entry.rank > 3);

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
            <p>{gameName}</p>
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
                const rank = index === 0 ? 2 : index === 1 ? 1 : 3;
                return (
                  <div
                    key={entry?.id ?? `share-empty-${rank}`}
                    className={`winSharePodium__slot winSharePodium__slot--${rank}${
                      rank === 1 ? " winSharePodium__slot--winner" : ""
                    }${entry ? "" : " winSharePodium__slot--empty"}`}
                  >
                    {entry ? (
                      <div className="winSharePodium__avatarWrap">
                        {rank === 1 ? (
                          <Crown
                            className="winSharePodium__crown"
                            size={30}
                            strokeWidth={2.3}
                            aria-hidden="true"
                          />
                        ) : null}
                        <ShareAvatar entry={entry} isTeamGame={isTeamGame} />
                      </div>
                    ) : null}
                    <div className="winSharePodium__base">
                      <div className="winSharePodium__rank">{rank}</div>
                      {entry ? (
                        <div className="winSharePodium__name">
                          {entry.name}
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

function ShareStat({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="winShareStat">
      <strong className={accent ? "winShareStat__value--accent" : undefined}>
        {value}
      </strong>
      <span>{label}</span>
    </div>
  );
}

function ShareAvatar({
  entry,
  isTeamGame,
  compact = false,
}: {
  entry: Standing;
  isTeamGame: boolean;
  compact?: boolean;
}) {
  const className = `winShareAvatar${compact ? " winShareAvatar--compact" : ""}`;
  if (isTeamGame && entry.icon) {
    return (
      <div className={`${className} winShareAvatar--team`}>
        <TeamIconGlyph icon={entry.icon} />
      </div>
    );
  }

  return (
    <div className={className} style={avatarStyleFor(entry.avatarColor)}>
      {entry.initials}
    </div>
  );
}
function toShareFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "plink";
}

function StandingAvatar({
  entry,
  isTeamGame,
}: {
  entry: Standing;
  isTeamGame: boolean;
}) {
  if (isTeamGame && entry.icon) {
    return (
      <div className="winFx__avatar winFx__avatar--team" aria-hidden="true">
        <TeamIconGlyph icon={entry.icon} />
      </div>
    );
  }

  return (
    <div
      className="winFx__avatar"
      style={avatarStyleFor(entry.avatarColor)}
      aria-hidden="true"
    >
      {entry.initials}
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
