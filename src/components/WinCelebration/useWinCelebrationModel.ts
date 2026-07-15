import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";

import { type ShareStatus, type WinCelebrationProps } from "./WinCelebration";
import {
  buildWinShareText,
  formatStatsSnapshotDate,
  getRankCounts,
} from "./WinShareCard";
export function useWinCelebrationModel(props: WinCelebrationProps) {
  const {
    isTeamGame = false,
    winnerName,
    resultKind = "winner",
    gameName,
    targetScore,
    startingScore,
    winCondition,
    winByTwo,
    manualEndOnly,
    completedAt,
    winnerStats,
    isLatestCompletedGame,
    standings,
    onDismiss,
  } = props;

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
  const rankCounts = getRankCounts(standings);
  const statsLabels =
    isSingleParticipantCompletion && !isTeamGame
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
          ? `Started at ${startingScore}, reached 0${
              winByTwo ? " · Win by 2" : ""
            }`
          : winCondition === "lowest"
            ? `Lowest score wins${winByTwo ? " · Win by 2" : ""}`
            : `Target ${targetScore} points${winByTwo ? " · Win by 2" : ""}`;
  const targetLabel = manualEndOnly
    ? targetScore > 0
      ? `Reference ${targetScore} point${Math.abs(targetScore) === 1 ? "" : "s"}${
          winByTwo ? " · Win by 2" : ""
        }`
      : "Manual end"
    : winCondition === "reach_zero"
      ? `Start ${startingScore}, reach ${targetScore}${
          winByTwo ? " · Win by 2" : ""
        }`
      : winCondition === "lowest"
        ? `Lowest score wins${winByTwo ? " · Win by 2" : ""}`
        : `Target ${targetScore} point${Math.abs(targetScore) === 1 ? "" : "s"}${
            winByTwo ? " · Win by 2" : ""
          }`;
  const heroWinStreak =
    !isDraw &&
    !isCompletedWithoutWinner &&
    !isSingleParticipantCompletion &&
    (winnerStats?.currentWinStreak ?? 0) > 1
      ? (winnerStats?.currentWinStreak ?? 0)
      : 0;
  const statsBadgeDate = isLatestCompletedGame
    ? null
    : formatStatsSnapshotDate(completedAt);
  const winnerStanding =
    standings.find((entry) => entry.isWinner) ?? standings[0] ?? null;
  const canShareWin =
    !isDraw &&
    !isCompletedWithoutWinner &&
    !isSingleParticipantCompletion &&
    Boolean(winnerName || winnerStanding);
  const shareText = canShareWin
    ? buildWinShareText({
        gameName,
        winnerName: winnerName ?? winnerStanding?.name ?? "Winner",
        targetLabel,
        isTeamGame,
        winnerStats,
        standings,
      })
    : "";

  async function handleShareWin() {
    if (!canShareWin) return;

    setShareStatus("preparing");
    try {
      const imageBlob = shareCardRef.current
        ? await toBlob(shareCardRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "#061013",
          })
        : null;
      const imageFile = imageBlob
        ? new File([imageBlob], "plink-win.png", { type: "image/png" })
        : null;
      const canShareImage =
        Boolean(imageFile) &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [imageFile as File] });

      if (imageFile && canShareImage) {
        await navigator.share({ files: [imageFile] });
        setShareStatus("idle");
        return;
      }

      if (typeof navigator.share === "function") {
        await navigator.share({ text: shareText });
        setShareStatus("idle");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareStatus("idle");
        return;
      }
      console.error("Unable to share win", error);
      setShareStatus("error");
      window.setTimeout(() => setShareStatus("idle"), 2200);
    }
  }

  const dialogLabel = isDraw
    ? `${gameName} ended in a draw`
    : isCompletedWithoutWinner
      ? `${gameName} ended without a winner`
      : isSingleParticipantCompletion
        ? `${gameName} completed by ${winnerName}`
        : `${winnerName} wins ${gameName}`;

  return {
    ...props,
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
  };
}
