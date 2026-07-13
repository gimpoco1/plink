import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  BarChart3,
  ArrowDownUp,
  Cloud,
  Dices,
  Dumbbell,
  Flag,
  Flame,
  GitCompareArrows,
  History,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Target,
  Timer,
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
  diceEnabled: boolean;
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

type QuickSetupFact = {
  key: string;
  label: string;
  icon: ReactNode;
  tone?: "accent" | "default";
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
  pendingLocalProfilesCount: number;
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
        game.diceEnabled ? "dice" : "no-dice",
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
    const parts: QuickSetupFact[] = [
      {
        key: "primary",
        label: setup.manualEndOnly
          ? setup.targetScore > 0
            ? `${setup.targetScore} ref`
            : "manual"
          : setup.winCondition === "reach_zero"
            ? `${setup.startingScore} start`
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
        label: "lowest wins",
        icon: <ArrowDownUp size={11} strokeWidth={2.35} aria-hidden="true" />,
      });
    } else if (setup.winCondition === "reach_zero") {
      parts.push({
        key: "reach-zero",
        label: "reach zero",
        icon: <RotateCcw size={11} strokeWidth={2.35} aria-hidden="true" />,
      });
    }

    if (setup.winByTwo) {
      parts.push({
        key: "win-by-two",
        label: "win by 2",
        icon: (
          <GitCompareArrows size={11} strokeWidth={2.35} aria-hidden="true" />
        ),
      });
    }

    if (setup.manualEndOnly && setup.targetScore > 0) {
      parts.push({
        key: "manual-end",
        label: "manual end",
        icon: <Flag size={11} strokeWidth={2.35} aria-hidden="true" />,
      });
    }

    if (setup.timerEnabled) {
      parts.push({
        key: "timer",
        label:
          setup.timerMode === "stopwatch"
            ? "stopwatch"
            : formatTimerText(setup.timerSeconds, "long"),
        icon: <Timer size={11} strokeWidth={2.35} aria-hidden="true" />,
      });
    }

    if (setup.diceEnabled) {
      parts.push({
        key: "dice",
        label: "dice",
        icon: <Dices size={11} strokeWidth={2.35} aria-hidden="true" />,
      });
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
          sessionCount={pendingLocalSessionsCount}
          profileCount={pendingLocalProfilesCount}
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
            <div>
              <div className="quickSetups__title">Games you play often</div>
              <p className="quickSetups__copy">
                Start a new game from your usual setups.
              </p>
            </div>
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
                          key={`${setup.key}-${fact.key}`}
                          className={`quickSetupCard__fact${
                            fact.tone === "accent"
                              ? " quickSetupCard__fact--accent"
                              : ""
                          }`}
                        >
                          <span
                            className="quickSetupCard__factIcon"
                            aria-hidden="true"
                          >
                            {fact.icon}
                          </span>
                          <span>{fact.label}</span>
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

      {!isAuthenticated && quickSetups.length === 0 ? (
        <section className="homeInfo" aria-label="About Plink">
          <div className="homeInfo__panel">
            <div className="homeInfo__panelGlow" aria-hidden="true" />

            <div className="homeInfo__hero">
              <div className="homeInfo__intro">
                <div className="homeInfo__eyebrow">How Plink helps</div>
                <h2 className="homeInfo__title">
                  Built for real game nights, not disposable counters.
                </h2>
                <p className="homeInfo__copy">
                  Reuse sessions, track teams, save progress, and check history
                  without starting from scratch every round.
                </p>
              </div>

              <aside className="homeInfo__spotlight" aria-label="Why Plink">
                <div className="homeInfo__spotlightBadge">
                  <Sparkles size={14} strokeWidth={2.4} aria-hidden="true" />
                  <span>Made for repeat play</span>
                </div>
                <div className="homeInfo__spotlightValue">
                  Set up once.
                  <br />
                  Keep the good parts.
                </div>
                <p className="homeInfo__spotlightCopy">
                  Reuse lineups and pick up where you left off.
                </p>
              </aside>
            </div>

            <div className="homeInfo__features">
              <article className="homeInfoFeature">
                <div className="homeInfoFeature__icon">
                  <History size={18} strokeWidth={2.35} aria-hidden="true" />
                </div>
                <div className="homeInfoFeature__body">
                  <h3>Recurring sessions</h3>
                  <p>
                    Reuse common setups and continue unfinished games.
                  </p>
                </div>
              </article>

              <article className="homeInfoFeature">
                <div className="homeInfoFeature__icon">
                  <Cloud size={18} strokeWidth={2.35} aria-hidden="true" />
                </div>
                <div className="homeInfoFeature__body">
                  <h3>Guest mode or sync</h3>
                  <p>
                    Start locally, or sign in later to sync across devices.
                  </p>
                </div>
              </article>

              <article className="homeInfoFeature">
                <div className="homeInfoFeature__icon">
                  <BarChart3 size={18} strokeWidth={2.35} aria-hidden="true" />
                </div>
                <div className="homeInfoFeature__body">
                  <h3>History that matters</h3>
                  <p>
                    Review wins, streaks, and past results after each match.
                  </p>
                </div>
              </article>
            </div>

            <div className="homeInfoLinks" aria-label="Helpful site links">
              <a href="/about.html">About</a>
              <a href="/faq.html">FAQ</a>
              <a href="/privacy.html">Privacy Policy</a>
              <a href="/support.html">Support</a>
              <a href="/terms.html">Terms of Use</a>
            </div>
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
