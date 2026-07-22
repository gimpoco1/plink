import { useMemo, useState } from "react";
import { AlertTriangle, Crown } from "lucide-react";
import type { Game } from "../types";
import { GameRowCard } from "../components/GameRowCard/GameRowCard";
import { AdBannerSlot } from "../components/AdBannerSlot/AdBannerSlot";
import { LocalSessionsHint } from "../components/LocalSessionsHint/LocalSessionsHint";
import { useEntitlementsContext } from "../hooks/useEntitlements";
import { isGameComplete } from "../utils/ranking";
import { getGameDisplayName } from "../utils/text";
import "../components/GameRowCard/GameRowCard.css";
import "../features/sessions/styles/SessionsScreen.css";

type SessionsScreenProps = {
  games: Game[];
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
  const { isLoading, isPro, maxSessions } = useEntitlementsContext();
  const [filter, setFilter] = useState<"all" | "inProgress" | "completed">("inProgress");
  const [sort, setSort] = useState<"recent" | "oldest" | "name">("recent");
  const ownedSessionCount = games.filter(
    (game) => game.accessRole !== "collaborator",
  ).length;
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
      new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  const sessions = useMemo(() => {
    const filtered = games.filter((game) => {
      const completed = isGameComplete(game);
      if (filter === "inProgress") return !completed;
      if (filter === "completed") return completed;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "name")
        return (
          getGameDisplayName(a.name).title.localeCompare(
            getGameDisplayName(b.name).title,
          ) || b.updatedAt - a.updatedAt
        );
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
      <AdBannerSlot
        placement="Sessions"
        slotId={import.meta.env.VITE_ADSENSE_SESSIONS_SLOT_ID}
      />
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
              <span>Session limit</span>
            </div>
            <p>
              {remainingSessions === 0
                ? `You reached the Free plan limit of ${maxSessions} games you create.`
                : `You can create ${remainingSessions} more Free ${
                    remainingSessions === 1 ? "game" : "games"
                  }.`}{" "}
              Shared games never use this limit. Upgrade to Pro for unlimited
              sessions of your own.
            </p>
          </div>
          <button
            className="btn btn--primary btn--sm sessionsLimitWarning__cta"
            type="button"
            onClick={onOpenProPlan}
          >
            <Crown size={16} strokeWidth={2.3} aria-hidden="true" />
            Get Pro
          </button>
        </div>
      ) : null}
      <ScreenHeader
        title="Sessions"
        subtitle="Reopen recent rounds and keep your history organized."
      />
      {games.length > 0 ? (
        <section className="homeList" aria-label="Game history">
          <div className="sessionsToolbar">
            <div
              className="sessionsToolbar__group"
              role="group"
              aria-label="Filter sessions"
            >
              {(["all", "inProgress", "completed"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`sessionsFilterChip${filter === value ? " sessionsFilterChip--active" : ""}`}
                  onClick={() => setFilter(value)}
                >
                  {value === "completed"
                    ? "Done"
                    : value === "inProgress"
                      ? "In Progress"
                      : value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`sessionsSortControl${sort !== "recent" ? " sessionsSortControl--active" : ""}`}
              onClick={cycleSort}
              aria-label={`Sort sessions: ${sort}`}
            >
              <span className="sessionsSortControl__label">
                {sort === "recent"
                  ? "Newest"
                  : sort === "oldest"
                    ? "Oldest"
                    : "Name"}
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
                  createdLabel={dateFormat.format(new Date(game.createdAt))}
                  onEnter={() => onEnter(game.id)}
                  onDuplicate={() => onDuplicate(game.id)}
                  onRename={() => onRename(game.id)}
                  onDelete={() => onDelete(game.id)}
                />
              ))}
            </div>
          ) : (
            <div className="emptyMsg">No sessions match this view.</div>
          )}
        </section>
      ) : (
        <div className="emptyMsg">No sessions yet.</div>
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
  return (
    <div className="tabHeader">
      <div>
        <h2 className="tabTitle">{title}</h2>
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
