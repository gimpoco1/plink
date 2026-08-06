import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Crown, Info } from "lucide-react";
import type { Game, PlayerProfile } from "../types";
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
  const [filter, setFilter] = useState<"all" | "inProgress" | "completed">(
    "inProgress",
  );
  const [sort, setSort] = useState<"recent" | "oldest" | "name">("recent");
  const ownedSessionCount = games.filter(
    (game) => game.accessRole !== "collaborator",
  ).length;
  const sharedSessionCount = Math.max(0, games.length - ownedSessionCount);
  const remainingSessions =
    maxSessions === null ? null : Math.max(0, maxSessions - ownedSessionCount);
  const showOwnedLimitInHeader = !isLoading && !isPro && maxSessions !== null;
  const sessionsTotalLabel = isPro
    ? `${games.length} ${games.length === 1 ? "session" : "sessions"}`
    : `${games.length} total`;
  const sessionsOwnedLabel =
    showOwnedLimitInHeader && maxSessions !== null
      ? `${ownedSessionCount}/${maxSessions} owned`
      : null;
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
  const accountProfileIds = useMemo(
    () =>
      new Set(
        profiles
          .filter((profile) => profile.isAccountPlayer)
          .map((profile) => profile.id),
      ),
    [profiles],
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
      {sessions.length > 0 ? (
        <AdBannerSlot
          placement="Sessions"
          slotId={import.meta.env.VITE_ADSENSE_SESSIONS_SLOT_ID}
        />
      ) : null}
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
                ? "You have no sessions left."
                : `You have ${remainingSessions} ${
                    remainingSessions === 1 ? "session" : "sessions"
                  } left.`}{" "}
              {hasSessionPass
                ? "Subscribe to Pro for unlimited sessions."
                : "Get more sessions or subscribe to Pro."}{" "}
              <span className="sessionsLimitWarning__note">
                (Deleting or reusing a past session affects player's progression
                and Stats)
              </span>
            </p>
          </div>
          <button
            className="btn btn--primary btn--sm sessionsLimitWarning__cta"
            type="button"
            onClick={onOpenProPlan}
          >
            <Crown size={16} strokeWidth={2.3} aria-hidden="true" />
            {hasSessionPass ? "Get Pro" : "See options"}
          </button>
        </div>
      ) : null}
      <ScreenHeader
        title="Sessions"
        subtitle="Reopen recent rounds and keep your history organized."
        totalLabel={sessionsTotalLabel}
        ownedLabel={sessionsOwnedLabel}
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
  totalLabel,
  ownedLabel,
}: {
  title: string;
  subtitle: string;
  totalLabel?: string | null;
  ownedLabel?: string | null;
}) {
  const [showMetaHelp, setShowMetaHelp] = useState(false);
  const metaHelpRef = useRef<HTMLSpanElement | null>(null);
  const metaHelpId = useId();
  const metaHelpText = {
    total:
      "TOTAL: all sessions including ones you were invited but did not create.",
    owned: "OWNED: sessions you created which count toward your plan limit.",
  };

  useEffect(() => {
    if (!showMetaHelp) return;

    function handlePointerDown(event: PointerEvent) {
      if (!metaHelpRef.current?.contains(event.target as Node)) {
        setShowMetaHelp(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowMetaHelp(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showMetaHelp]);

  return (
    <div className="tabHeader">
      <div>
        <div className="sessionsTitleRow">
          <h2 className="tabTitle">{title}</h2>
          {totalLabel ? (
            <span className="sessionsHeaderMetaChip">
              <span className="sessionsHeaderMetaChip__total">
                {totalLabel}
              </span>
              {ownedLabel ? (
                <>
                  <span
                    className="sessionsHeaderMetaChip__sep"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <span className="sessionsHeaderMetaChip__owned">
                    {ownedLabel}
                  </span>
                  <span
                    className="sessionsHeaderMetaChip__help"
                    ref={metaHelpRef}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="sessionsHeaderMetaChip__helpBtn"
                      aria-label="Explain session totals"
                      aria-expanded={showMetaHelp}
                      aria-controls={metaHelpId}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setShowMetaHelp((value) => !value);
                      }}
                    >
                      <Info size={12} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                    <span
                      id={metaHelpId}
                      role="tooltip"
                      className={`sessionsHeaderMetaChip__tooltip${showMetaHelp ? " sessionsHeaderMetaChip__tooltip--open" : ""}`}
                    >
                      <span className="sessionsHeaderMetaChip__tooltipLine">
                        {metaHelpText.total}
                      </span>

                      <span className="sessionsHeaderMetaChip__tooltipLine">
                        {metaHelpText.owned}
                      </span>
                    </span>
                  </span>
                </>
              ) : null}
            </span>
          ) : null}
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
