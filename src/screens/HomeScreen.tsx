import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type {
  Game,
  GameTeam,
  PlayerProfile,
  ScoreDirection,
  TeamMember,
  WinCondition,
} from "../types";
import { DEFAULT_TEAM_ICON } from "../constants";
import {
  NewGameCard,
  type NewGameInput,
} from "../components/NewGameCard/NewGameCard";
import { HomeGuestPreview } from "../components/HomeGuestPreview/HomeGuestPreview";
import { LocalSessionsHint } from "../components/LocalSessionsHint/LocalSessionsHint";
import { HOME_NEW_GAME_OPEN_KEY } from "../constants";
import { avatarStyleFor } from "../utils/color";
import { getGameDisplayName } from "../utils/text";
import { getInitials } from "../utils/text";
import { isGameComplete } from "../utils/ranking";
import "./HomeScreen.css";
import {
  Dumbbell,
  Flag,
  Flame,
  Shield,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

type QuickSetup = {
  key: string;
  label: string;
  participantMode: "players" | "teams";
  scoreDirection: ScoreDirection;
  startingScore: number;
  targetScore: number;
  winCondition: WinCondition;
  winByTwo: boolean;
  manualEndOnly: boolean;
  timerEnabled: boolean;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
  suggestedPlayers: { name: string; avatarColor: string; profileId?: string }[];
  suggestedTeams?: Array<{
    id: string;
    name: string;
    icon?: string;
    members: Array<{ name: string; avatarColor: string; profileId?: string }>;
  }>;
  uses: number;
};

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

type HomeScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  canUseTeams: boolean;
  isAuthenticated: boolean;
  showLocalSessionsHint: boolean;
  pendingLocalSessionsCount: number;
  isCreating: boolean;
  presetDraft?: NewGameInput | null;
  presetDraftToken?: number;
  onCreatingChange: (creating: boolean) => void;
  onOpenAuth: () => void;
  onOpenProFeatureAuth: () => void;
  onOpenLocalImport: () => void;
  onOpenProPlan: () => void;
  onDismissLocalSessionsHint: () => void;
  onOpenTeamsTab: (draft: NewGameInput) => void;
  onCreate: (input: NewGameInput) => boolean | Promise<boolean>;
  onStartQuickSetup: (
    input: NewGameInput,
    details: {
      label: string;
      players: { name: string; avatarColor: string }[];
      teams?: Array<{
        id: string;
        name: string;
        icon?: string;
        members: { name: string; avatarColor: string }[];
      }>;
    },
  ) => void | Promise<void>;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onEnter: (gameId: string) => void;
};

export function HomeScreen({
  games,
  profiles,
  teams,
  teamMembers,
  canUseTeams,
  isAuthenticated,
  showLocalSessionsHint,
  pendingLocalSessionsCount,
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
}: HomeScreenProps) {
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
    if (!isAuthenticated) return [];
    const setups = new Map<string, QuickSetup>();

    for (const game of games) {
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
  }, [games, isAuthenticated, profilesById]);

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

  function getSuggestionFacts(setup: QuickSetup) {
    const parts = [
      setup.manualEndOnly
        ? setup.targetScore > 0
          ? `${setup.targetScore} ref`
          : "manual end"
        : setup.winCondition === "reach_zero"
          ? `${setup.startingScore} start`
          : `${setup.targetScore} pts`,
    ];

    if (setup.winCondition === "lowest") {
      parts.push("lowest wins");
    } else if (setup.winCondition === "reach_zero") {
      parts.push("reach zero");
    }

    if (setup.winByTwo) {
      parts.push("win by 2");
    }

    if (setup.manualEndOnly && setup.targetScore > 0) {
      parts.push("manual end");
    }

    if (setup.timerEnabled) {
      parts.push(
        setup.timerMode === "stopwatch"
          ? "stopwatch"
          : formatTimerText(setup.timerSeconds, "long"),
      );
    }

    return parts;
  }

  function formatTimerText(seconds: number, mode: "short" | "long") {
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

  return (
    <div className="tabContent tabContent--home">
      {!isAuthenticated ? <HomeGuestPreview onOpenAuth={onOpenAuth} /> : null}
      {showLocalSessionsHint ? (
        <LocalSessionsHint
          className="homeLocalSessionsHint"
          count={pendingLocalSessionsCount}
          onDismiss={onDismissLocalSessionsHint}
          onAdd={onOpenLocalImport}
        />
      ) : null}

      <section
        className={`homeHero${showForm ? " homeHero--creating" : ""}${
          resumableGame ? " homeHero--hasResume" : ""
        }`}
      >
        <div className="homeHero__intro">
          <div>
            <div className="homeHero__eyebrow">Your scoreboard</div>
            <h1 className="homeHero__title">
              Keep the score.
              <br />
              Enjoy the game.
            </h1>
            <p className="homeHero__copy">
              Jump into a new match or keep your next round moving fast.
            </p>
          </div>
        </div>
        {resumableGame ? (
          <div className="homeHero__actions">
            <div className="homeHero__resumeWrap">
              <span
                className={`homeHero__resumePill${
                  resumableGame.participantMode === "teams"
                    ? " homeHero__resumePill--teams"
                    : ""
                }`}
              >
                {resumableGameLabel}
              </span>
              <button
                className="btn btn--ghost btn--xl homeHero__secondary"
                type="button"
                onClick={() => onEnter(resumableGame.id)}
              >
                <span aria-hidden="true">↺</span> Resume last game
              </button>
            </div>
          </div>
        ) : null}
        <div ref={newGameCardWrapRef} className="homeHero__newGameWrap">
          <NewGameCard
            open={showForm}
            profiles={profiles}
            teams={teams}
            teamMembers={teamMembers}
            canUseTeams={canUseTeams}
            isAuthenticated={isAuthenticated}
            draft={presetDraft}
            draftToken={presetDraftToken}
            onOpenChange={handleOpenChange}
            onOpenAuth={onOpenAuth}
            onOpenProFeatureAuth={onOpenProFeatureAuth}
            onOpenProPlan={onOpenProPlan}
            onOpenTeamsTab={onOpenTeamsTab}
            onCreate={onCreate}
            onUpsertProfile={onUpsertProfile}
          />
        </div>
      </section>

      {quickSetups.length > 0 ? (
        <section className="quickSetups" aria-label="Games you play often">
          <div className="quickSetups__head">
            <div className="homeList__title">Games you play often</div>
          </div>
          <div className="quickSetups__grid">
            {quickSetups.map((setup, index) => (
              <button
                key={`${setup.key}-${index}`}
                type="button"
                className="quickSetupCard"
                onClick={() => startSuggestion(setup)}
              >
                <div className="quickSetupCard__main">
                  <div className="quickSetupCard__titleRow">
                    <div className="quickSetupCard__title">{setup.label}</div>
                    {setup.participantMode === "teams" ? (
                      <span className="quickSetupCard__teamsChip">
                        <Users size={10} strokeWidth={2.5} aria-hidden="true" />
                        Teams
                      </span>
                    ) : null}
                  </div>
                  <div className="quickSetupCard__metaRow">
                    <div className="quickSetupCard__facts" aria-hidden="true">
                      {getSuggestionFacts(setup).map((fact) => (
                        <span
                          key={`${setup.key}-${fact}`}
                          className="quickSetupCard__fact"
                        >
                          {fact}
                        </span>
                      ))}
                    </div>
                    {setup.participantMode === "teams" &&
                    setup.suggestedTeams &&
                    setup.suggestedTeams.length > 0 ? (
                      <div
                        className="quickSetupCard__teams"
                        aria-label="Preset teams"
                      >
                        {setup.suggestedTeams.slice(0, 4).map((team, index) => (
                          <Fragment
                            key={`${setup.key}-${team.id}-${team.name}-${index}`}
                          >
                            {index > 0 ? (
                              <span className="quickSetupCard__versus">vs</span>
                            ) : null}
                            <span
                              className="quickSetupCard__teamIcon"
                              title={team.name}
                              aria-hidden="true"
                            >
                              <QuickSetupTeamIcon icon={team.icon} />
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    ) : setup.suggestedPlayers.length > 0 ? (
                      <div
                        className="quickSetupCard__players"
                        aria-label="Preset players"
                      >
                        {setup.suggestedPlayers
                          .slice(0, 4)
                          .map((player, index) => (
                            <span
                              key={`${setup.key}-${player.profileId ?? player.name}-${index}`}
                              className="quickSetupCard__playerAvatar"
                              style={avatarStyleFor(player.avatarColor)}
                              title={player.name}
                            >
                              {getInitials(player.name)}
                            </span>
                          ))}
                        {setup.suggestedPlayers.length > 4 ? (
                          <span className="quickSetupCard__playerMore">
                            +{setup.suggestedPlayers.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="quickSetupCard__action">
                  <span className="quickSetupCard__actionLabel">Start</span>
                  <span
                    className="quickSetupCard__actionIcon"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function QuickSetupTeamIcon({ icon }: { icon?: string }) {
  const Icon =
    TEAM_ICON_COMPONENTS[
      (icon ?? DEFAULT_TEAM_ICON) as keyof typeof TEAM_ICON_COMPONENTS
    ] ?? Dumbbell;
  return <Icon size={16} strokeWidth={2.35} aria-hidden="true" />;
}
