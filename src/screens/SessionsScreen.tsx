import { getCurrentLanguage, translate } from "../i18n/translate";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Crown } from "lucide-react";
import type { Game, PlayerProfile } from "../types";
import { GameRowCard } from "../components/GameRowCard/GameRowCard";
import { LocalSessionsHint } from "../components/LocalSessionsHint/LocalSessionsHint";
import { useEntitlementsContext } from "../hooks/useEntitlements";
import { isGameComplete } from "../utils/ranking";
import { getGameDisplayName } from "../utils/text";
import "../components/GameRowCard/GameRowCard.css";
import "../features/sessions/styles/SessionsScreen.css";

type SessionsScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  showLocalSessionsHint: boolean;
  pendingLocalSessionsCount: number;
  pendingLocalProfilesCount: number;
  onDismissLocalSessionsHint: () => void;
  onOpenAuth: () => void;
  onOpenProPlan: () => void;
  onEnter: (gameId: string) => void;
  onDuplicate: (gameId: string) => void;
  onRename: (gameId: string) => void;
  onDelete: (gameId: string) => void;
};

export function SessionsScreen({
  games,
  profiles,
  showLocalSessionsHint,
  pendingLocalSessionsCount,
  pendingLocalProfilesCount,
  onDismissLocalSessionsHint,
  onOpenAuth,
  onOpenProPlan,
  onEnter,
  onDuplicate,
  onRename,
  onDelete,
}: SessionsScreenProps) {
  const { hasSessionPass, isLoading, isPro, maxSessions } =
    useEntitlementsContext();
  const [filter, setFilter] = useState<
    "all" | "inProgress" | "completed" | "owned" | "invited"
  >("inProgress");
  const [sort, setSort] = useState<"recent" | "oldest" | "name">("recent");

  const ownedSessionCount = games.filter(
    (game) => game.accessRole !== "collaborator",
  ).length;
  const sharedSessionCount = games.filter(
    (game) =>
      game.accessRole === "collaborator" ||
      game.players.some((player) => player.joinedViaInvite === true),
  ).length;
  const hasSharedSessions = sharedSessionCount > 0;
  const remainingSessions =
    maxSessions === null ? null : Math.max(0, maxSessions - ownedSessionCount);
  const showSessionLimitWarning =
    !isLoading &&
    !isPro &&
    maxSessions !== null &&
    remainingSessions !== null &&
    remainingSessions <= 2;

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(getCurrentLanguage(), {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  const accountProfileIds = useMemo(
    () =>
      new Set(
        profiles
          .filter((profile) => profile.isAccountPlayer)
          .map((profile) => profile.id),
      ),
    [profiles],
  );

  useEffect(() => {
    if (!hasSharedSessions && (filter === "owned" || filter === "invited")) {
      setFilter("inProgress");
    }
  }, [filter, hasSharedSessions]);

  const sessions = useMemo(() => {
    const filtered = games.filter((game) => {
      const completed = isGameComplete(game);
      const isOwned = game.accessRole !== "collaborator";
      if (filter === "inProgress") return !completed;
      if (filter === "completed") return completed;
      if (filter === "owned") return isOwned;
      if (filter === "invited") return !isOwned;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "name") {
        return (
          getGameDisplayName(a.name).title.localeCompare(
            getGameDisplayName(b.name).title,
          ) || b.updatedAt - a.updatedAt
        );
      }
      if (sort === "oldest") return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt;
    });
  }, [filter, games, sort]);

  function cycleSort() {
    setSort((current) =>
      current === "recent"
        ? "oldest"
        : current === "oldest"
          ? "name"
          : "recent",
    );
  }

  return (
    <div className="tabContent tabContent--sessions">
      {showLocalSessionsHint ? (
        <LocalSessionsHint
          className="signedInHint"
          sessionCount={pendingLocalSessionsCount}
          profileCount={pendingLocalProfilesCount}
          onDismiss={onDismissLocalSessionsHint}
          onAdd={onOpenAuth}
        />
      ) : null}
      {showSessionLimitWarning ? (
        <div className="sessionsLimitWarning" role="status" aria-live="polite">
          <div className="sessionsLimitWarning__content">
            <div className="sessionsLimitWarning__eyebrow">
              <AlertTriangle size={16} strokeWidth={2.4} aria-hidden="true" />
              <span>{translate("copy.sessionLimit")}</span>
            </div>
            <p>
              {remainingSessions === 0
                ? translate("copy.noSessionsLeft")
                : translate("dynamic.sessionsLeft", [remainingSessions])}{" "}
              {hasSessionPass
                ? translate("copy.subscribeToProForUnlimitedSessions")
                : translate("copy.getMoreSessionsOrSubscribeToPro")}{" "}
              <span className="sessionsLimitWarning__note">
                {translate("copy.deletingOrReusingAPastSessionAffectsPlayerSProgressionAndStats")}
              </span>
            </p>
          </div>
          <button
            className="btn btn--primary btn--sm sessionsLimitWarning__cta"
            type="button"
            onClick={onOpenProPlan}
          >
            <Crown size={16} strokeWidth={2.3} aria-hidden="true" />
            {hasSessionPass
              ? translate("copy.getPro")
              : translate("copy.seeOptions")}
          </button>
        </div>
      ) : null}
      <ScreenHeader
        title={translate("tabs.sessions")}
        subtitle={translate("copy.reopenRecentRoundsAndKeepYourHistoryOrganized")}
      />
      {games.length > 0 ? (
        <section
          className="homeList"
          aria-label={translate("topbar.gameHistory")}
        >
          <div className="sessionsToolbar">
            <div
              className="sessionsToolbar__group"
              role="group"
              aria-label={translate("copy.filterSessions")}
            >
              {(
                [
                  "all",
                  "inProgress",
                  "completed",
                  ...(hasSharedSessions ? (["owned", "invited"] as const) : []),
                ] as const
              ).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`sessionsFilterChip${filter === value ? " sessionsFilterChip--active" : ""}`}
                  onClick={() => setFilter(value)}
                >
                  {value === "completed"
                    ? translate("copy.done")
                    : value === "inProgress"
                      ? translate("copy.inProgress")
                      : value === "owned"
                        ? translate("copy.owned")
                        : value === "invited"
                          ? translate("copy.invited")
                          : value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`sessionsSortControl${sort !== "recent" ? " sessionsSortControl--active" : ""}`}
              onClick={cycleSort}
                  aria-label={translate("dynamic.sortSessions", [sort])}
            >
              <span className="sessionsSortControl__label">
                {sort === "recent"
                  ? translate("copy.newest")
                  : sort === "oldest"
                    ? translate("copy.oldest")
                    : translate("copy.name")}
              </span>
              <SortIcon mode={sort} />
            </button>
          </div>
          {sessions.length > 0 ? (
            <div className="gameRows">
              {sessions.map((game) => (
                <GameRowCard
                  key={game.id}
                  game={game}
                  accountProfileIds={accountProfileIds}
                  createdLabel={dateFormat.format(new Date(game.createdAt))}
                  onEnter={() => onEnter(game.id)}
                  onDuplicate={() => onDuplicate(game.id)}
                  onRename={() => onRename(game.id)}
                  onDelete={() => onDelete(game.id)}
                />
              ))}
            </div>
          ) : (
            <div className="emptyMsg">
              {translate("copy.noSessionsMatchThisView")}
            </div>
          )}
        </section>
      ) : (
        <div className="emptyMsg">{translate("copy.noSessionsYet")}</div>
      )}
    </div>
  );
}

function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const [showMetaHelp, setShowMetaHelp] = useState(false);
  const [showUpgradeHelp, setShowUpgradeHelp] = useState(false);
  const metaHelpRef = useRef<HTMLSpanElement | null>(null);
  const upgradeHelpRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!showMetaHelp && !showUpgradeHelp) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const insideMeta = metaHelpRef.current?.contains(target);
      const insideUpgrade = upgradeHelpRef.current?.contains(target);
      if (!insideMeta && !insideUpgrade) {
        setShowMetaHelp(false);
        setShowUpgradeHelp(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMetaHelp(false);
        setShowUpgradeHelp(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showMetaHelp, showUpgradeHelp]);

  return (
    <div className="tabHeader">
      <div>
        <div className="sessionsTitleRow">
          <h2 className="tabTitle">{title}</h2>
        </div>
        <p className="tabSubtitle">{subtitle}</p>
      </div>
    </div>
  );
}

function SortIcon({ mode }: { mode: "recent" | "oldest" | "name" }) {
  if (mode === "name") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4v16M7 20l-3-3m3 3 3-3M17 4v16m0 0 3-3m-3 3-3-3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={
          mode === "recent"
            ? "M12 4v12m0 0 4-4m-4 4-4-4"
            : "M12 20V8m0 0 4 4m-4-4-4 4"
        }
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
