import { translate } from "../../../i18n/translate";
import {
  ArrowDownUp,
  Dices,
  Flag,
  GitCompareArrows,
  RotateCcw,
  Target,
  Timer,
} from "lucide-react";
import type { QuickSetup, QuickSetupFact } from "../types/homeScreenTypes";

export function getSuggestionFacts(setup: QuickSetup) {
  const parts: QuickSetupFact[] = [
    {
      key: "primary",
      label: setup.manualEndOnly
        ? setup.targetScore > 0
          ? `${setup.targetScore} ref`
          : "manual"
        : setup.winCondition === "reach_zero"
          ? translate("dynamic.start", [setup.startingScore])
          : `${setup.targetScore} pts`,
      icon: setup.manualEndOnly ? (
        <Flag size={11} strokeWidth={2.35} aria-hidden="true" />
      ) : setup.winCondition === "reach_zero" ? (
        <RotateCcw size={11} strokeWidth={2.35} aria-hidden="true" />
      ) : (
        <Target size={11} strokeWidth={2.45} aria-hidden="true" />
      ),
      tone: "accent",
    },
  ];

  if (setup.winCondition === "lowest") {
    parts.push({
      key: "lowest",
      label: translate("copy.lowestWins"),
      icon: <ArrowDownUp size={11} strokeWidth={2.35} aria-hidden="true" />,
    });
  } else if (setup.winCondition === "reach_zero") {
    parts.push({
      key: "reach-zero",
      label: translate("copy.reachZero"),
      icon: <RotateCcw size={11} strokeWidth={2.35} aria-hidden="true" />,
    });
  }

  if (setup.winByTwo) {
    parts.push({
      key: "win-by-two",
      label: translate("copy.winBy2"),
      icon: (
        <GitCompareArrows size={11} strokeWidth={2.35} aria-hidden="true" />
      ),
    });
  }

  if (setup.manualEndOnly && setup.targetScore > 0) {
    parts.push({
      key: "manual-end",
      label: translate("copy.manualEnd"),
      icon: <Flag size={11} strokeWidth={2.35} aria-hidden="true" />,
    });
  }

  if (setup.timerEnabled) {
    parts.push({
      key: "timer",
      label:
        setup.timerMode === "stopwatch"
          ? translate("copy.stopwatch")
          : formatTimerText(setup.timerSeconds, "long"),
      icon: <Timer size={11} strokeWidth={2.35} aria-hidden="true" />,
    });
  }

  if (setup.diceEnabled) {
    parts.push({
      key: "dice",
      label: translate("copy.dice"),
      icon: <Dices size={11} strokeWidth={2.35} aria-hidden="true" />,
    });
  }

  return parts;
}

export function formatTimerText(seconds: number, mode: "short" | "long") {
  const totalSeconds = Math.max(0, Math.trunc(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (mode === "short") {
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    if (minutes > 0) {
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes} min`;
    }
    return `${remainingSeconds}s`;
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m timer` : `${hours}h timer`;
  }
  if (minutes > 0) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s timer`
      : `${minutes}m timer`;
  }
  return `${remainingSeconds}s timer`;
}
