import { translate } from "../../i18n/translate";
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
  const winByTwoSuffix = winByTwo
    ? translate("common.winByTwoSuffix")
    : "";

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
          title: translate("copy.playerStats"),
          total: translate("copy.totalWins"),
          rate: translate("copy.winRate"),
          streak: translate("copy.winStreak"),
          aria: translate("copy.updatedPlayerStats"),
        }
      : isTeamGame
        ? {
            title: translate("copy.teamStats"),
            total: translate("copy.teamWins"),
            rate: translate("copy.winRate"),
            streak: translate("copy.winStreak"),
            aria: translate("copy.updatedTeamStats"),
          }
        : {
            title: translate("copy.winnerStats"),
            total: translate("copy.totalWins"),
            rate: translate("copy.winRate"),
            streak: translate("copy.winStreak"),
            aria: translate("copy.updatedWinnerStats"),
          };
  const resultHint = isSingleParticipantCompletion
    ? translate("copy.sessionCompleted")
    : isCompletedWithoutWinner
      ? translate("copy.endedWithoutAWinner")
      : manualEndOnly
        ? translate("copy.endedManually")
        : winCondition === "reach_zero"
          ? translate("dynamic.startedAtReachedZero", [
              startingScore,
              winByTwoSuffix,
            ])
          : winCondition === "lowest"
            ? translate("dynamic.lowestScoreWins", [winByTwoSuffix])
            : translate("dynamic.targetPoints", [targetScore, winByTwoSuffix]);
  const targetLabel = manualEndOnly
    ? targetScore > 0
      ? translate("dynamic.referencePoint", [targetScore, "", winByTwoSuffix])
      : translate("copy.manualEnd")
    : winCondition === "reach_zero"
      ? translate("dynamic.startReach", [startingScore, targetScore, winByTwoSuffix])
      : winCondition === "lowest"
        ? translate("dynamic.lowestScoreWins", [winByTwoSuffix])
        : translate("dynamic.targetPoint", [targetScore, "", winByTwoSuffix]);
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
        winnerName:
          winnerName ?? winnerStanding?.name ?? translate("copy.winner"),
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
    ? translate("dynamic.endedInADraw", [gameName])
    : isCompletedWithoutWinner
      ? translate("dynamic.endedWithoutWinner", [gameName])
      : isSingleParticipantCompletion
        ? translate("dynamic.completedBy", [gameName, winnerName])
        : translate("dynamic.wins", [winnerName, gameName]);

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
