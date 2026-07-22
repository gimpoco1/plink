import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type {
  Game,
  GameTeam,
  PlayerProfile,
  ScoreDirection,
  TeamMember,
  WinCondition,
} from "../../../types";
import {
  NewGameCard,
  type NewGameInput,
} from "../../../components/NewGameCard/NewGameCard";
import { HomeGuestPreview } from "../../../components/HomeGuestPreview/HomeGuestPreview";
import { LocalSessionsHint } from "../../../components/LocalSessionsHint/LocalSessionsHint";
import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";
import { HOME_NEW_GAME_OPEN_KEY } from "../../../constants";
import { avatarStyleFor } from "../../../utils/color";
import { getGameDisplayName } from "../../../utils/text";
import { getInitials } from "../../../utils/text";
import { isGameComplete } from "../../../utils/ranking";
import "../styles/HomeScreen.css";
import {
  BarChart3,
  ArrowDownUp,
  Cloud,
  Dices,
  Flag,
  GitCompareArrows,
  History,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Users,
} from "lucide-react";

import type { HomeScreenProps, QuickSetup } from "../types/homeScreenTypes";

export function useHomeScreenModel(props: HomeScreenProps) {
  const {
    games,
    profiles,
    teams,
    teamMembers,
    canUseTeams,
    isAuthenticated,
    showLocalSessionsHint,
    pendingLocalSessionsCount,
    pendingLocalProfilesCount,
    isCreating,
    presetDraft,
    presetDraftToken,
    onCreatingChange,
    onOpenAuth,
    onOpenProFeatureAuth,
    onOpenLocalImport,
    onOpenProPlan,
    onDismissLocalSessionsHint,
    onOpenTeamsTab,
    onCreate,
    onStartQuickSetup,
    onUpsertProfile,
    onEnter,
  } = props;

  const [persistedNewGameOpen, setPersistedNewGameOpen] = useState<
    boolean | null
  >(() => {
    try {
      const stored = localStorage.getItem(HOME_NEW_GAME_OPEN_KEY);
      if (stored === "open") return true;
      if (stored === "closed") return false;
      return null;
    } catch {
      return null;
    }
  });
  const newGameCardWrapRef = useRef<HTMLDivElement | null>(null);
  const defaultOpen = isAuthenticated && games.length === 0 ? true : false;
  const showForm = isCreating || (persistedNewGameOpen ?? defaultOpen);

  useEffect(() => {
    try {
      localStorage.setItem(
        HOME_NEW_GAME_OPEN_KEY,
        showForm ? "open" : "closed",
      );
      setPersistedNewGameOpen(showForm);
    } catch {
      // Ignore storage failures and keep the current session state.
    }
  }, [showForm]);
  const profilesById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  function handleOpenChange(nextOpen: boolean) {
    setPersistedNewGameOpen(nextOpen);
    onCreatingChange(nextOpen);
  }

  useEffect(() => {
    if (!isCreating || !showForm) return;

    function centerCardInView() {
      const cardWrap = newGameCardWrapRef.current;
      if (!cardWrap) return;

      const scrollHost = cardWrap.closest(".tabWindow") as HTMLElement | null;
      if (!scrollHost) {
        cardWrap.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const hostRect = scrollHost.getBoundingClientRect();
      const cardRect = cardWrap.getBoundingClientRect();

      const cardOffsetInHost = cardRect.top - hostRect.top;
      const centeredTop =
        scrollHost.scrollTop +
        cardOffsetInHost -
        (hostRect.height - cardRect.height) / 2;
      const maxTop = Math.max(
        0,
        scrollHost.scrollHeight - scrollHost.clientHeight,
      );
      const nextTop = Math.min(maxTop, Math.max(0, centeredTop));

      scrollHost.scrollTo({ top: nextTop, behavior: "smooth" });
    }

    const rafId = window.requestAnimationFrame(centerCardInView);
    const afterExpandId = window.setTimeout(centerCardInView, 420);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(afterExpandId);
    };
  }, [isCreating, showForm]);

  const resumableGame = useMemo(() => {
    return (
      [...games]
        .filter((game) => !isGameComplete(game))
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
    );
  }, [games]);
  const resumableGameLabel = useMemo(() => {
    if (!resumableGame) return "";
    const parsed = getGameDisplayName(resumableGame.name);
    return parsed.replayNumber
      ? `${parsed.title} #${parsed.replayNumber}`
      : parsed.title;
  }, [resumableGame]);

  const quickSetups = useMemo(() => {
    const setups = new Map<string, QuickSetup>();

    for (const game of games) {
      const isOwnedGame = game.isShared
        ? game.accessRole === "owner"
        : game.accessRole !== "collaborator";
      const usesOnlySavedPlayers =
        game.players.length > 0 &&
        game.players.every(
          (player) =>
            !!player.profileId && profilesById.has(player.profileId),
        );
      if (!isOwnedGame || !usesOnlySavedPlayers) continue;

      const label = getGameDisplayName(game.name).title;
      const key = [
        label,
        game.participantMode ?? "players",
        game.scoreDirection,
        game.startingScore,
        game.targetScore,
        game.winCondition,
        game.winByTwo,
        game.manualEndOnly,
        game.timerEnabled ? game.timerMode : "off",
        game.timerEnabled ? game.timerSeconds : 0,
        game.diceEnabled ? "dice" : "no-dice",
        game.quickScoreValues.join(","),
      ].join("|");

      const existing = setups.get(key);
      if (existing) {
        existing.uses += 1;
        continue;
      }

      setups.set(key, {
        key,
        label,
        participantMode: game.participantMode ?? "players",
        scoreDirection: game.scoreDirection,
        startingScore: game.startingScore,
        targetScore: game.targetScore,
        winCondition: game.winCondition,
        winByTwo: game.winByTwo,
        manualEndOnly: game.manualEndOnly,
        timerEnabled: game.timerEnabled,
        diceEnabled: game.diceEnabled,
        quickScoreValues: game.quickScoreValues,
        timerMode: game.timerMode,
        timerSeconds: game.timerSeconds,
        suggestedPlayers: game.players.slice(0, 4).map((player) => {
          const savedProfile = player.profileId
            ? profilesById.get(player.profileId)
            : undefined;
          return {
            name: savedProfile?.name ?? player.name,
            avatarColor: savedProfile?.avatarColor ?? player.avatarColor,
            profileId: player.profileId,
          };
        }),
        suggestedTeams:
          game.participantMode === "teams"
            ? game.teams.map((team) => ({
                id: team.id,
                name: team.name,
                icon: team.icon,
                members: game.players
                  .filter((player) => player.teamId === team.id)
                  .map((player) => ({
                    name: player.name,
                    avatarColor: player.avatarColor,
                    profileId: player.profileId,
                  })),
              }))
            : undefined,
        uses: 1,
      });
    }

    return [...setups.values()]
      .sort((a, b) => b.uses - a.uses || a.label.localeCompare(b.label))
      .slice(0, 3);
  }, [games, profilesById]);

  function nextSuggestionName(baseName: string) {
    const normalized = baseName
      .trim()
      .replace(/\s+\(\d+\)$/g, "")
      .toUpperCase();
    let maxNumber = 0;

    for (const game of games) {
      const parsed = getGameDisplayName(game.name);
      if (parsed.title.toUpperCase() !== normalized) continue;
      if (parsed.replayNumber)
        maxNumber = Math.max(maxNumber, parsed.replayNumber);
      else if (game.name.toUpperCase() === normalized)
        maxNumber = Math.max(maxNumber, 1);
    }

    return maxNumber > 0 ? `${normalized} (${maxNumber + 1})` : normalized;
  }

  function startSuggestion(setup: QuickSetup) {
    void onStartQuickSetup(
      {
        name: nextSuggestionName(setup.label),
        participantMode: setup.participantMode,
        scoreDirection: setup.scoreDirection,
        startingScore: setup.startingScore,
        targetScore: setup.targetScore,
        winCondition: setup.winCondition,
        winByTwo: setup.winByTwo,
        manualEndOnly: setup.manualEndOnly,
        timerEnabled: setup.timerEnabled,
        diceEnabled: setup.diceEnabled,
        quickScoreValues: setup.quickScoreValues,
        timerMode: setup.timerMode,
        timerSeconds: setup.timerSeconds,
        initialPlayers: setup.suggestedPlayers,
        initialTeams: setup.suggestedTeams ?? [],
      },
      {
        label: setup.label,
        players: setup.suggestedPlayers.map((player) => ({
          name: player.name,
          avatarColor: player.avatarColor,
        })),
        teams: setup.suggestedTeams?.map((team) => ({
          id: team.id,
          name: team.name,
          icon: team.icon,
          members: team.members.map((member) => ({
            name: member.name,
            avatarColor: member.avatarColor,
          })),
        })),
      },
    );
  }

  return {
    ...props,
    persistedNewGameOpen,
    setPersistedNewGameOpen,
    newGameCardWrapRef,
    defaultOpen,
    showForm,
    profilesById,
    handleOpenChange,
    resumableGame,
    resumableGameLabel,
    quickSetups,
    nextSuggestionName,
    startSuggestion,
  };
}
