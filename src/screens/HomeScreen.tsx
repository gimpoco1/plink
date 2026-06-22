import { useEffect, useMemo, useState, type TouchEvent } from "react";
import type { Game, PlayerProfile } from "../types";
import type { HomeTab } from "../App";
import { GameRowCard } from "../components/GameRowCard";
import { avatarStyleFor } from "../utils/color";
import { AVATAR_COLORS } from "../constants";
import {
  formatPlayerName,
  getGameDisplayName,
  getInitials,
} from "../utils/text";
import {
  computeProfileStats,
  createEmptyProfileStats,
} from "../utils/profileStats";
import { findWinner } from "../utils/ranking";
import "./HomeScreen.css";

type StagedPlayer = {
  name: string;
  avatarColor: string;
};

type QuickSetup = {
  key: string;
  label: string;
  targetPoints: number;
  isLowScoreWins: boolean;
  timerEnabled: boolean;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
  suggestedPlayers: { name: string; avatarColor: string; profileId?: string }[];
  uses: number;
};

type Props = {
  games: Game[];
  profiles: PlayerProfile[];
  activeTab: HomeTab;
  onActiveTabChange: (tab: HomeTab) => void;
  onCreate: (input: {
    name: string;
    targetPoints: number;
    isLowScoreWins: boolean;
    timerEnabled: boolean;
    timerMode: "countdown" | "stopwatch";
    timerSeconds: number;
    initialPlayers: { name: string; avatarColor: string; profileId?: string }[];
  }) => void;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onUpdateProfile: (
    id: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
  onDeleteProfile: (id: string) => void;
  onDuplicate: (gameId: string) => void;
  onRename: (gameId: string) => void;
  onEnter: (gameId: string) => void;
  onDelete: (gameId: string) => void;
};

export function HomeScreen({
  games,
  profiles,
  onCreate,
  onUpsertProfile,
  onUpdateProfile,
  onDeleteProfile,
  onDuplicate,
  onRename,
  onEnter,
  onDelete,
  activeTab,
  onActiveTabChange,
}: Props) {
  const tabs: HomeTab[] = ["home", "sessions", "stats", "players"];
  const [name, setName] = useState("");
  const [target, setTarget] = useState("8");
  const [isLowScoreWins, setIsLowScoreWins] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">(
    "countdown",
  );
  const [timerMinutes, setTimerMinutes] = useState("5");
  const [timerSecondsRaw, setTimerSecondsRaw] = useState("0");
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState("");
  const [isAddingInTab, setIsAddingInTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabColor, setNewTabColor] = useState<
    (typeof AVATAR_COLORS)[number]["value"]
  >(AVATAR_COLORS[0].value);

  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set(),
  );
  const [stagedPlayers, setStagedPlayers] = useState<StagedPlayer[]>([]);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [saveAsProfile, setSaveAsProfile] = useState(true);
  const [newPlayerColor, setNewPlayerColor] = useState<
    (typeof AVATAR_COLORS)[number]["value"]
  >(AVATAR_COLORS[0].value);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [sessionsFilter, setSessionsFilter] = useState<
    "all" | "active" | "completed"
  >("all");
  const [sessionsSort, setSessionsSort] = useState<
    "recent" | "oldest" | "name"
  >("recent");

  function setActiveTab(nextTab: HomeTab) {
    onActiveTabChange(nextTab);
  }

  function toggleProfile(profileId: string) {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function addStagedPlayer() {
    if (!newPlayerName.trim()) return;

    if (saveAsProfile) {
      const p = onUpsertProfile(newPlayerName.trim(), newPlayerColor);
      if (p) {
        setSelectedProfileIds((prev) => new Set([...prev, p.id]));
      }
    } else {
      setStagedPlayers((prev) => [
        ...prev,
        { name: newPlayerName.trim(), avatarColor: newPlayerColor },
      ]);
    }

    setNewPlayerName("");
    setNewPlayerColor(
      AVATAR_COLORS[
        (profiles.length + stagedPlayers.length + 1) % AVATAR_COLORS.length
      ].value,
    );
    setIsAddingPlayer(false);
  }

  function removeStagedPlayer(index: number) {
    setStagedPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    function handleNewGame() {
      setActiveTab("home");
      setIsCreating(true);
      setSelectedProfileIds(new Set());
      setStagedPlayers([]);
    }

    function handleAddPlayer() {
      setActiveTab("players");
      setIsAddingInTab(true);
    }

    window.addEventListener("plink:new-game", handleNewGame as EventListener);
    window.addEventListener(
      "plink:add-player",
      handleAddPlayer as EventListener,
    );
    return () => {
      window.removeEventListener(
        "plink:new-game",
        handleNewGame as EventListener,
      );
      window.removeEventListener(
        "plink:add-player",
        handleAddPlayer as EventListener,
      );
    };
  }, []);

  // Auto-show form if no games exist
  const showForm = isCreating || games.length === 0;

  const parsedTarget = useMemo(() => Number.parseInt(target, 10), [target]);
  const parsedTimerMinutes = useMemo(
    () => Number.parseInt(timerMinutes, 10),
    [timerMinutes],
  );
  const parsedTimerSeconds = useMemo(
    () => Number.parseInt(timerSecondsRaw, 10),
    [timerSecondsRaw],
  );
  const parsedTimerTotalSeconds = useMemo(() => {
    const mins = Number.isFinite(parsedTimerMinutes)
      ? Math.max(0, parsedTimerMinutes)
      : 0;
    const secs = Number.isFinite(parsedTimerSeconds)
      ? Math.max(0, Math.min(59, parsedTimerSeconds))
      : 0;
    return mins * 60 + secs;
  }, [parsedTimerMinutes, parsedTimerSeconds]);
  const canCreate =
    name.trim().length > 0 &&
    Number.isFinite(parsedTarget) &&
    parsedTarget > 0 &&
    (!timerEnabled ||
      timerMode === "stopwatch" ||
      parsedTimerTotalSeconds > 0) &&
    (selectedProfileIds.size > 0 || stagedPlayers.length > 0);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  const profileStats = useMemo(() => computeProfileStats(games), [games]);

  const playersOverview = useMemo(() => {
    let trackedSessions = 0;
    let activeSessions = 0;
    let totalWins = 0;

    profileStats.forEach((stats) => {
      trackedSessions += stats.gamesPlayed;
      activeSessions += stats.inProgressGames;
      totalWins += stats.wins;
    });

    return { trackedSessions, activeSessions, totalWins };
  }, [profileStats]);

  const statsOverview = useMemo(() => {
    const completedGames = games.filter(
      (game) =>
        !!findWinner(game.players, game.targetPoints, game.isLowScoreWins),
    ).length;

    const topPlayer =
      profiles
        .map((profile) => ({
          profile,
          stats: profileStats.get(profile.id) ?? createEmptyProfileStats(),
        }))
        .sort((a, b) => {
          if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
          return b.stats.winRate - a.stats.winRate;
        })[0] ?? null;

    const hottestStreak =
      profiles
        .map((profile) => ({
          profile,
          stats: profileStats.get(profile.id) ?? createEmptyProfileStats(),
        }))
        .sort(
          (a, b) => b.stats.currentWinStreak - a.stats.currentWinStreak,
        )[0] ?? null;

    const popularGames = Array.from(
      games.reduce((map, game) => {
        const name = getGameDisplayName(game.name).title;
        map.set(name, (map.get(name) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    )
      .map(([name, sessions]) => ({ name, sessions }))
      .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))
      .slice(0, 4);

    const topPlayers = profiles
      .map((profile) => ({
        profile,
        stats: profileStats.get(profile.id) ?? createEmptyProfileStats(),
      }))
      .filter(({ stats }) => stats.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
        if (b.stats.currentWinStreak !== a.stats.currentWinStreak) {
          return b.stats.currentWinStreak - a.stats.currentWinStreak;
        }
        return b.stats.winRate - a.stats.winRate;
      })
      .slice(0, 5);

    return {
      completedGames,
      activeGames: games.length - completedGames,
      topPlayer,
      hottestStreak,
      popularGames,
      topPlayers,
    };
  }, [games, profiles, profileStats]);

  const visibleSessions = useMemo(() => {
    const filtered = games.filter((game) => {
      const isCompleted = !!findWinner(
        game.players,
        game.targetPoints,
        game.isLowScoreWins,
      );

      if (sessionsFilter === "active") return !isCompleted;
      if (sessionsFilter === "completed") return isCompleted;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sessionsSort === "name") {
        const aName = getGameDisplayName(a.name).title.toUpperCase();
        const bName = getGameDisplayName(b.name).title.toUpperCase();
        return aName.localeCompare(bName) || b.updatedAt - a.updatedAt;
      }

      if (sessionsSort === "oldest") {
        return a.createdAt - b.createdAt;
      }

      return b.updatedAt - a.updatedAt;
    });
  }, [games, sessionsFilter, sessionsSort]);

  const quickSetups = useMemo(() => {
    const setups = new Map<string, QuickSetup>();

    for (const game of games) {
      const label = getGameDisplayName(game.name).title;
      const key = [
        label,
        game.targetPoints,
        game.isLowScoreWins ? "low" : "high",
        game.timerEnabled ? game.timerMode : "off",
        game.timerEnabled ? game.timerSeconds : 0,
      ].join("|");

      const existing = setups.get(key);
      if (existing) {
        existing.uses += 1;
        continue;
      }

      const suggestedPlayers = game.players.slice(0, 4).map((player) => ({
        name: player.name,
        avatarColor: player.avatarColor,
        profileId: player.profileId,
      }));

      setups.set(key, {
        key,
        label,
        targetPoints: game.targetPoints,
        isLowScoreWins: game.isLowScoreWins,
        timerEnabled: game.timerEnabled,
        timerMode: game.timerMode,
        timerSeconds: game.timerSeconds,
        suggestedPlayers,
        uses: 1,
      });
    }

    return Array.from(setups.values())
      .sort((a, b) => b.uses - a.uses || a.label.localeCompare(b.label))
      .slice(0, 3);
  }, [games]);

  function getNextQuickSuggestionName(baseName: string) {
    const normalizedBase = baseName
      .trim()
      .replace(/\s+\(\d+\)$/g, "")
      .toUpperCase();

    let maxNumber = 0;
    for (const game of games) {
      const parsed = getGameDisplayName(game.name);
      if (parsed.title.toUpperCase() !== normalizedBase) continue;
      if (parsed.replayNumber) {
        maxNumber = Math.max(maxNumber, parsed.replayNumber);
      } else if (game.name.toUpperCase() === normalizedBase) {
        maxNumber = Math.max(maxNumber, 1);
      }
    }

    return maxNumber > 0
      ? `${normalizedBase} (${maxNumber + 1})`
      : normalizedBase;
  }

  function startQuickSuggestion(setup: QuickSetup) {
    setActiveTab("home");
    setSelectedProfileIds(new Set());
    setStagedPlayers([]);
    onCreate({
      name: getNextQuickSuggestionName(setup.label),
      targetPoints: setup.targetPoints,
      isLowScoreWins: setup.isLowScoreWins,
      timerEnabled: setup.timerEnabled,
      timerMode: setup.timerMode,
      timerSeconds: setup.timerSeconds,
      initialPlayers: setup.suggestedPlayers.map((player) => ({
        name: player.name,
        avatarColor: player.avatarColor,
        profileId: player.profileId,
      })),
    });
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const interactionTarget = event.target as HTMLElement | null;
    if (interactionTarget?.closest(".swipeRow")) {
      setTouchStartX(null);
      setTouchStartY(null);
      setDragX(0);
      setDragging(false);
      return;
    }

    const startX = event.touches[0]?.clientX ?? null;
    const startY = event.touches[0]?.clientY ?? null;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const edgeThreshold = Math.min(92, Math.max(56, viewportWidth * 0.2));
    const isEdgeStart =
      startX !== null &&
      (startX <= edgeThreshold || startX >= viewportWidth - edgeThreshold);

    setTouchStartX(startX);
    setTouchStartY(startY);
    setDragX(0);
    setDragging(isEdgeStart);
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    if (!dragging || touchStartX === null || touchStartY === null) return;

    const currentX = event.touches[0]?.clientX ?? touchStartX;
    const currentY = event.touches[0]?.clientY ?? touchStartY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
    }

    setDragX(deltaX);
  }

  function finishTouch(event: TouchEvent<HTMLElement>) {
    if (touchStartX === null || touchStartY === null) return;

    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    const deltaY = (event.changedTouches[0]?.clientY ?? 0) - touchStartY;
    if (Math.abs(deltaX) < 90 || Math.abs(deltaX) < Math.abs(deltaY)) {
      setTouchStartX(null);
      setTouchStartY(null);
      setDragX(0);
      setDragging(false);
      return;
    }

    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex =
      deltaX < 0
        ? Math.min(tabs.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);

    setActiveTab(tabs[nextIndex]);
    setTouchStartX(null);
    setTouchStartY(null);
    setDragX(0);
    setDragging(false);
  }

  return (
    <div className="homeContainer">
      <main className="homeScreen">
        <div
          className="tabSlider"
          data-active={activeTab}
          data-dragging={dragging ? "true" : "false"}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={finishTouch}
          onTouchCancel={finishTouch}
          style={{
            transform: dragging
              ? `translateX(${-(tabs.indexOf(activeTab) * 25) + (dragX / (typeof window !== "undefined" ? window.innerWidth : 1)) * 25}%)`
              : undefined,
          }}
        >
          <div className="tabWindow">
            <div className="tabContent tabContent--home">
              {!showForm ? (
                <section className="homeHero">
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
                  <button
                    className="btn btn--primary btn--xl homeHero__action"
                    type="button"
                    onClick={() => {
                      setIsCreating(true);
                      setSelectedProfileIds(new Set());
                      setStagedPlayers([]);
                    }}
                  >
                    <span aria-hidden="true">＋</span> New game
                  </button>
                </section>
              ) : null}
              {!showForm && quickSetups.length > 0 ? (
                <section className="quickSetups" aria-label="Quick suggestions">
                  <div className="quickSetups__head">
                    <div className="homeList__title">Quick suggestions</div>
                    <span className="quickSetups__hint">Tap to start</span>
                  </div>
                  <div className="quickSetups__grid">
                    {quickSetups.map((setup) => (
                      <button
                        key={setup.key}
                        type="button"
                        className="quickSetupCard"
                        onClick={() => startQuickSuggestion(setup)}
                      >
                        <div className="quickSetupCard__title">
                          {setup.label}
                        </div>
                        <div className="quickSetupCard__meta">
                          <span className="quickSetupChip quickSetupChip--accent">
                            Target {setup.targetPoints}
                          </span>
                          {setup.isLowScoreWins ? (
                            <span className="quickSetupChip">Lowest wins</span>
                          ) : null}
                          {setup.timerEnabled ? (
                            <span className="quickSetupChip">
                              {setup.timerMode === "stopwatch"
                                ? "Stopwatch"
                                : `${Math.floor(setup.timerSeconds / 60)}:${String(
                                    setup.timerSeconds % 60,
                                  ).padStart(2, "0")}`}
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="quickSetupCard__players"
                          aria-hidden="true"
                        >
                          {setup.suggestedPlayers.slice(0, 3).map((player) => (
                            <span
                              key={`${setup.key}-${player.profileId ?? player.name}`}
                              className="quickSetupPlayer"
                              style={avatarStyleFor(player.avatarColor)}
                              title={player.name}
                            >
                              {getInitials(player.name)}
                            </span>
                          ))}
                          {setup.suggestedPlayers.length > 3 ? (
                            <span className="quickSetupPlayer quickSetupPlayer--more">
                              +{setup.suggestedPlayers.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {showForm && (
                <section className="homeCard createCard">
                  <div className="homeCard__header">
                    <div>
                      <div className="homeCard__eyebrow">New session</div>
                      <div className="homeCard__title">Set up your game</div>
                    </div>
                    {games.length > 0 && (
                      <button
                        className="btn btn--ghost btn--sm"
                        type="button"
                        onClick={() => setIsCreating(false)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="homeForm">
                    <div className="fieldGroup">
                      <label className="field">
                        <span className="field__label">
                          What are you playing?
                        </span>
                        <input
                          className="input"
                          value={name}
                          autoFocus={!isAddingPlayer}
                          placeholder="e.g. POKER"
                          onChange={(e) => setName(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span className="field__label">Target score</span>
                        <input
                          className="input"
                          value={target}
                          onChange={(e) =>
                            setTarget(e.target.value.replace(/[^\d]/g, ""))
                          }
                          inputMode="numeric"
                        />
                      </label>
                    </div>

                    <div className="profilePicker">
                      <label className="saveProfileOption gameModeOption">
                        <input
                          type="checkbox"
                          checked={isLowScoreWins}
                          onChange={(e) => setIsLowScoreWins(e.target.checked)}
                        />
                        <span>Reverse scoring (higher score loses)</span>
                      </label>
                      <label className="saveProfileOption gameModeOption">
                        <input
                          type="checkbox"
                          checked={timerEnabled}
                          onChange={(e) => setTimerEnabled(e.target.checked)}
                        />
                        <span>Timer</span>
                      </label>
                      {timerEnabled ? (
                        <div
                          className={`timerConfigRow${timerMode === "countdown" ? " timerConfigRow--countdown" : ""}`}
                        >
                          <label className="field">
                            <span className="field__label">Timer mode</span>
                            <div className="timerModeToggle">
                              <button
                                type="button"
                                className={`timerModeToggle__btn${timerMode === "countdown" ? " timerModeToggle__btn--active" : ""}`}
                                onClick={() => setTimerMode("countdown")}
                              >
                                Countdown
                              </button>
                              <button
                                type="button"
                                className={`timerModeToggle__btn${timerMode === "stopwatch" ? " timerModeToggle__btn--active" : ""}`}
                                onClick={() => setTimerMode("stopwatch")}
                              >
                                Stopwatch
                              </button>
                            </div>
                          </label>
                          {timerMode === "countdown" ? (
                            <>
                              <label className="field timerNumberField">
                                <span className="field__label">Minutes</span>
                                <input
                                  className="input"
                                  value={timerMinutes}
                                  onChange={(e) =>
                                    setTimerMinutes(
                                      e.target.value.replace(/[^\d]/g, ""),
                                    )
                                  }
                                  inputMode="numeric"
                                />
                              </label>
                              <label className="field timerNumberField">
                                <span className="field__label">Seconds</span>
                                <input
                                  className="input"
                                  value={timerSecondsRaw}
                                  onChange={(e) =>
                                    setTimerSecondsRaw(
                                      e.target.value.replace(/[^\d]/g, ""),
                                    )
                                  }
                                  inputMode="numeric"
                                />
                              </label>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      <span className="field__label">Add players</span>
                      <div
                        className="profilePicker__summary"
                        aria-live="polite"
                      >
                        {selectedProfileIds.size + stagedPlayers.length === 0
                          ? "Choose at least one player"
                          : `${selectedProfileIds.size + stagedPlayers.length} ${selectedProfileIds.size + stagedPlayers.length === 1 ? "player" : "players"} ready`}
                      </div>
                      <div className="profilePicker__list">
                        {profiles.map((p) => {
                          const isSelected = selectedProfileIds.has(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className="profileOption"
                              data-active={isSelected}
                              onClick={() => toggleProfile(p.id)}
                            >
                              <div
                                className="profileOption__avatar"
                                style={avatarStyleFor(p.avatarColor)}
                              >
                                {getInitials(p.name)}
                              </div>
                              <span className="profileOption__name">
                                {p.name}
                              </span>
                              {isSelected && (
                                <div className="profileOption__check">✓</div>
                              )}
                            </button>
                          );
                        })}

                        {stagedPlayers.map((p, i) => (
                          <button
                            key={`staged-${i}`}
                            type="button"
                            className="profileOption"
                            data-active="true"
                            onClick={() => removeStagedPlayer(i)}
                          >
                            <div
                              className="profileOption__avatar"
                              style={avatarStyleFor(p.avatarColor)}
                            >
                              {getInitials(p.name)}
                            </div>
                            <span className="profileOption__name">
                              {p.name}
                            </span>
                            <div className="profileOption__check">×</div>
                          </button>
                        ))}

                        {!isAddingPlayer ? (
                          <button
                            type="button"
                            className="profileOption profileOption--add"
                            onClick={() => setIsAddingPlayer(true)}
                          >
                            <div className="profileOption__avatar">+</div>
                            <span className="profileOption__name">
                              New Player
                            </span>
                          </button>
                        ) : (
                          <div className="newPlayerForm">
                            <input
                              className="input input--sm"
                              autoFocus
                              placeholder="Player Name"
                              value={newPlayerName}
                              onChange={(e) => setNewPlayerName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addStagedPlayer();
                                if (e.key === "Escape")
                                  setIsAddingPlayer(false);
                              }}
                            />
                            <div className="newPlayerForm__colors">
                              {AVATAR_COLORS.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="colorDisc"
                                  style={{ background: c.value }}
                                  data-active={newPlayerColor === c.value}
                                  onClick={() => setNewPlayerColor(c.value)}
                                  aria-label={`Use ${c.id} color`}
                                  aria-pressed={newPlayerColor === c.value}
                                />
                              ))}
                            </div>
                            <label className="saveProfileOption">
                              <input
                                type="checkbox"
                                checked={saveAsProfile}
                                onChange={(e) =>
                                  setSaveAsProfile(e.target.checked)
                                }
                              />
                              <span>Save for future games</span>
                            </label>
                            <div className="newPlayerForm__actions">
                              <button
                                className="btn btn--sm"
                                type="button"
                                onClick={() => setIsAddingPlayer(false)}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn btn--primary btn--sm"
                                type="button"
                                disabled={!newPlayerName.trim()}
                                onClick={addStagedPlayer}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className="btn btn--primary btn--wide btn--xl"
                      type="button"
                      disabled={!canCreate}
                      onClick={() => {
                        const pList = profiles
                          .filter((p) => selectedProfileIds.has(p.id))
                          .map((p) => ({
                            name: p.name,
                            avatarColor: p.avatarColor,
                            profileId: p.id,
                          }));

                        const sList = stagedPlayers.map((p) => ({
                          name: p.name,
                          avatarColor: p.avatarColor,
                        }));

                        onCreate({
                          name,
                          targetPoints: parsedTarget,
                          isLowScoreWins,
                          timerEnabled,
                          timerMode,
                          timerSeconds:
                            timerMode === "countdown"
                              ? Math.max(1, parsedTimerTotalSeconds)
                              : 300,
                          initialPlayers: [...pList, ...sList],
                        });
                      }}
                    >
                      Start Game
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>

          <div className="tabWindow">
            <div className="tabContent tabContent--sessions">
              <div className="tabHeader">
                <div>
                  <h2 className="tabTitle">Sessions</h2>
                  <p className="tabSubtitle">
                    Reopen recent rounds and keep your history organized.
                  </p>
                </div>
              </div>

              {games.length > 0 ? (
                <section className="homeList" aria-label="Game history">
                  <div className="homeList__title">Recent Sessions</div>
                  <div className="sessionsToolbar">
                    <div className="sessionsToolbar__group" role="group" aria-label="Filter sessions">
                      <button
                        type="button"
                        className={`sessionsFilterChip${sessionsFilter === "all" ? " sessionsFilterChip--active" : ""}`}
                        onClick={() => setSessionsFilter("all")}
                        aria-label="Show all sessions"
                        title="All sessions"
                      >
                        <span>All</span>
                      </button>
                      <button
                        type="button"
                        className={`sessionsFilterChip${sessionsFilter === "active" ? " sessionsFilterChip--active" : ""}`}
                        onClick={() => setSessionsFilter("active")}
                        aria-label="Show active sessions"
                        title="Active sessions"
                      >
                        <span>Active</span>
                      </button>
                      <button
                        type="button"
                        className={`sessionsFilterChip${sessionsFilter === "completed" ? " sessionsFilterChip--active" : ""}`}
                        onClick={() => setSessionsFilter("completed")}
                        aria-label="Show completed sessions"
                        title="Completed sessions"
                      >
                        <span>Done</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`sessionsSortControl${sessionsSort !== "recent" ? " sessionsSortControl--active" : ""}`}
                      onClick={() =>
                        setSessionsSort((current) => {
                          if (current === "recent") return "oldest";
                          if (current === "oldest") return "name";
                          return "recent";
                        })
                      }
                      aria-label={`Sort sessions: ${sessionsSort}`}
                      title={`Sort: ${sessionsSort}`}
                    >
                      <span className="sessionsSortControl__label">
                        {sessionsSort === "recent"
                          ? "Newest"
                          : sessionsSort === "oldest"
                            ? "Oldest"
                            : "Name"}
                      </span>
                      {sessionsSort === "recent" ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 4v12m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : sessionsSort === "oldest" ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 20V8m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M7 4v16M7 20l-3-3m3 3 3-3M17 4v16m0 0 3-3m-3 3-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {visibleSessions.length > 0 ? (
                    <div className="gameRows">
                      {visibleSessions.map((g) => {
                        const created = dateFmt.format(new Date(g.createdAt));
                        return (
                          <GameRowCard
                            key={g.id}
                            game={g}
                            createdLabel={created}
                            onEnter={() => onEnter(g.id)}
                            onDuplicate={() => onDuplicate(g.id)}
                            onRename={() => onRename(g.id)}
                            onDelete={() => onDelete(g.id)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="emptyMsg">No sessions match this view.</div>
                  )}
                </section>
              ) : (
                <div className="emptyMsg">No sessions yet.</div>
              )}
            </div>
          </div>

          <div className="tabWindow">
            <div className="tabContent tabContent--stats">
              <div className="tabHeader">
                <div>
                  <h2 className="tabTitle">Stats</h2>
                  <p className="tabSubtitle">
                    A quick snapshot of your sessions, players, and momentum.
                  </p>
                </div>
              </div>

              <div className="statsHeroGrid">
                <div className="statsHeroCard statsHeroCard--accent">
                  <span className="statsHeroCard__label">Completed</span>
                  <strong>{statsOverview.completedGames}</strong>
                  <p>Finished sessions tracked locally.</p>
                </div>
                <div className="statsHeroCard">
                  <span className="statsHeroCard__label">In progress</span>
                  <strong>{statsOverview.activeGames}</strong>
                  <p>Games still live right now.</p>
                </div>
                <div className="statsHeroCard">
                  <span className="statsHeroCard__label">Top player</span>
                  <strong>
                    {statsOverview.topPlayer?.profile.name ?? "—"}
                  </strong>
                  <p>
                    {statsOverview.topPlayer
                      ? `${statsOverview.topPlayer.stats.wins} wins`
                      : "No winners yet"}
                  </p>
                </div>
                <div className="statsHeroCard">
                  <span className="statsHeroCard__label">Hottest streak</span>
                  <strong>
                    {statsOverview.hottestStreak?.stats.currentWinStreak
                      ? `${statsOverview.hottestStreak.stats.currentWinStreak}x`
                      : "—"}
                  </strong>
                  <p>
                    {statsOverview.hottestStreak?.stats.currentWinStreak
                      ? statsOverview.hottestStreak.profile.name
                      : "No active streaks"}
                  </p>
                </div>
              </div>

              <div className="statsPanels">
                <section className="statsPanel">
                  <div className="statsPanel__head">
                    <h3>Top players</h3>
                    <span>{statsOverview.topPlayers.length}</span>
                  </div>
                  {statsOverview.topPlayers.length > 0 ? (
                    <div className="statsList">
                      {statsOverview.topPlayers.map(
                        ({ profile, stats }, index) => (
                          <div key={profile.id} className="statsRow">
                            <div className="statsRow__left">
                              <span className="statsRow__rank">
                                #{index + 1}
                              </span>
                              <div
                                className="statsRow__avatar"
                                style={avatarStyleFor(profile.avatarColor)}
                              >
                                {getInitials(profile.name)}
                              </div>
                              <div className="statsRow__meta">
                                <strong>{profile.name}</strong>
                                <span>
                                  {stats.currentWinStreak > 0
                                    ? `${stats.currentWinStreak}x streak`
                                    : `${stats.winRate}% rate`}
                                </span>
                              </div>
                            </div>
                            <div className="statsRow__value">{stats.wins}</div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="emptyMsg">No player stats yet.</div>
                  )}
                </section>

                <section className="statsPanel">
                  <div className="statsPanel__head">
                    <h3>Popular games</h3>
                    <span>{statsOverview.popularGames.length}</span>
                  </div>
                  {statsOverview.popularGames.length > 0 ? (
                    <div className="statsList">
                      {statsOverview.popularGames.map((game, index) => (
                        <div key={game.name} className="statsRow">
                          <div className="statsRow__left">
                            <span className="statsRow__rank">#{index + 1}</span>
                            <div className="statsRow__meta">
                              <strong>{game.name}</strong>
                              <span>Most played setup</span>
                            </div>
                          </div>
                          <div className="statsRow__value">{game.sessions}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="emptyMsg">No games logged yet.</div>
                  )}
                </section>
              </div>
            </div>
          </div>

          <div className="tabWindow">
            <div className="tabContent tabContent--players">
              <div className="tabHeader">
                <div>
                  <h2 className="tabTitle">Saved Players</h2>
                  <p className="tabSubtitle">
                    Reuse profiles and track cumulative results across sessions.
                  </p>
                </div>
              </div>

              <div className="profilesOverview">
                <div className="profilesOverview__item">
                  <span className="profilesOverview__label">Saved</span>
                  <strong>{profiles.length}</strong>
                </div>
                <div className="profilesOverview__item">
                  <span className="profilesOverview__label">Sessions</span>
                  <strong>{playersOverview.trackedSessions}</strong>
                </div>
                <div className="profilesOverview__item">
                  <span className="profilesOverview__label">Wins</span>
                  <strong>{playersOverview.totalWins}</strong>
                </div>
                <div className="profilesOverview__item">
                  <span className="profilesOverview__label">Active</span>
                  <strong>{playersOverview.activeSessions}</strong>
                </div>
              </div>

              <div className="profilesGrid">
                {isAddingInTab && (
                  <div className="profileCard profileCard--new">
                    <div className="profileCard__main">
                      <div
                        className="profileAvatar"
                        style={avatarStyleFor(newTabColor)}
                      >
                        {newTabName.trim() ? getInitials(newTabName) : "+"}
                      </div>
                      <div className="editGroup">
                        <input
                          autoFocus
                          className="editInput"
                          placeholder="Player Name"
                          value={newTabName}
                          onChange={(e) => setNewTabName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTabName.trim()) {
                              onUpsertProfile(newTabName.trim(), newTabColor);
                              setIsAddingInTab(false);
                              setNewTabName("");
                            }
                            if (e.key === "Escape") setIsAddingInTab(false);
                          }}
                        />
                      </div>
                    </div>
                    <div className="profileCard__footer">
                      <div className="profileCard__colors">
                        {AVATAR_COLORS.map((c) => (
                          <button
                            key={c.id}
                            className={`colorDot ${newTabColor === c.value ? "active" : ""}`}
                            style={{ backgroundColor: c.value }}
                            onClick={() => setNewTabColor(c.value)}
                            aria-label={`Use ${c.id} color`}
                            aria-pressed={newTabColor === c.value}
                          />
                        ))}
                      </div>
                      <div className="newProfileActions">
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setIsAddingInTab(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn--primary btn--sm"
                          disabled={!newTabName.trim()}
                          onClick={() => {
                            onUpsertProfile(newTabName.trim(), newTabColor);
                            setIsAddingInTab(false);
                            setNewTabName("");
                          }}
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {profiles.length === 0 && !isAddingInTab ? (
                  <div className="emptyMsg">No saved players yet.</div>
                ) : (
                  profiles.map((p) => {
                    const stats =
                      profileStats.get(p.id) ?? createEmptyProfileStats();
                    return (
                      <div key={p.id} className="profileCard">
                        <div className="profileCard__main">
                          <div
                            className="profileAvatar"
                            style={avatarStyleFor(p.avatarColor)}
                          >
                            {getInitials(p.name)}
                          </div>
                          {editingProfileId === p.id ? (
                            <div className="editGroup">
                              <input
                                autoFocus
                                className="editInput"
                                value={editProfileName}
                                onChange={(e) =>
                                  setEditProfileName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const name =
                                      formatPlayerName(editProfileName);
                                    if (name) onUpdateProfile(p.id, { name });
                                    setEditingProfileId(null);
                                  }
                                  if (e.key === "Escape")
                                    setEditingProfileId(null);
                                }}
                              />
                              <button
                                className="miniBtn"
                                onClick={() => {
                                  const name =
                                    formatPlayerName(editProfileName);
                                  if (name) onUpdateProfile(p.id, { name });
                                  setEditingProfileId(null);
                                }}
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <div className="profileCard__info">
                              <div className="profileCard__header">
                                <div
                                  className="profileCard__name"
                                  onClick={() => {
                                    setEditingProfileId(p.id);
                                    setEditProfileName(p.name);
                                  }}
                                >
                                  {p.name}
                                </div>
                                {stats.topWonGame ? (
                                  <div className="profileCard__gameWin">
                                    <span className="profileCard__gameWinLabel">
                                      Top game
                                    </span>
                                    <strong>{stats.topWonGame.name}</strong>
                                    <span>
                                      {stats.topWonGame.wins}{" "}
                                      {stats.topWonGame.wins === 1
                                        ? "win"
                                        : "wins"}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>

                        <div
                          className="profileStatsRow"
                          aria-label={`${p.name} cumulative stats`}
                        >
                          <div className="profileStatPill">
                            <span className="profileStatPill__label">Wins</span>
                            <strong className="profileStatPill__value">
                              {stats.wins}
                            </strong>
                          </div>
                          <div className="profileStatPill">
                            <span className="profileStatPill__label">Rate</span>
                            <strong className="profileStatPill__value">
                              {stats.completedGames > 0
                                ? `${stats.winRate}%`
                                : "—"}
                            </strong>
                          </div>
                          <div className="profileStatPill">
                            <span className="profileStatPill__label">Done</span>
                            <strong className="profileStatPill__value">
                              {stats.completedGames}
                            </strong>
                          </div>
                          <div className="profileStatPill">
                            <span className="profileStatPill__label">
                              Streak
                            </span>
                            <strong className="profileStatPill__value">
                              {stats.currentWinStreak > 0
                                ? `${stats.currentWinStreak}x`
                                : "—"}
                            </strong>
                          </div>
                        </div>

                        {stats.gameResults.length > 0 ? (
                          <details className="profileGamesDropdown">
                            <summary className="profileGamesDropdown__summary">
                              <span>Games</span>
                              <span className="profileGamesDropdown__count">
                                {stats.gameResults.length}
                              </span>
                            </summary>
                            <div className="profileCard__gameResults">
                              {stats.gameResults.map((result) => (
                                <div
                                  key={result.name}
                                  className="profileCard__gameResult"
                                >
                                  <span>{result.name}</span>
                                  <strong>
                                    {result.wins}{" "}
                                    {result.wins === 1 ? "win" : "wins"}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}

                        <div className="profileCard__footer">
                          <div className="profileCard__colors">
                            {AVATAR_COLORS.map((c) => (
                              <button
                                key={c.id}
                                className={`colorDot ${p.avatarColor === c.value ? "active" : ""}`}
                                style={{ backgroundColor: c.value }}
                                onClick={() =>
                                  onUpdateProfile(p.id, {
                                    avatarColor: c.value,
                                  })
                                }
                                aria-label={`Use ${c.id} color for ${p.name}`}
                                aria-pressed={p.avatarColor === c.value}
                              />
                            ))}
                          </div>
                          <button
                            className="deleteBtn"
                            type="button"
                            onClick={() => onDeleteProfile(p.id)}
                            aria-label={`Delete ${p.name}`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M9 3h6m-12 4h18m-16 0 .8 13.6a2 2 0 0 0 2 .4h6.4a2 2 0 0 0 2-.4L19 7"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <nav className="tabBar">
        <button
          className="tabItem"
          data-active={activeTab === "home"}
          onClick={() => {
            setActiveTab("home");
            if (isCreating) setIsCreating(false);
          }}
          aria-label="Games"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="9 22 9 12 15 12 15 22"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Home</span>
        </button>

        <button
          className="tabItem"
          data-active={activeTab === "sessions"}
          onClick={() => {
            setActiveTab("sessions");
            if (isCreating) setIsCreating(false);
          }}
          aria-label="Sessions"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M7 3h10m-9 4h8m-9 5h10m-9 5h8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Sessions</span>
        </button>

        <button
          className="tabItem"
          data-active={activeTab === "stats"}
          onClick={() => {
            setActiveTab("stats");
            if (isCreating) setIsCreating(false);
          }}
          aria-label="Statistics"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M4 19h16M7 15V9m5 6V5m5 10v-4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Stats</span>
        </button>

        <button
          className="tabItem"
          data-active={activeTab === "players"}
          onClick={() => setActiveTab("players")}
          aria-label="Saved players"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="9"
              cy="7"
              r="4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23 21v-2a4 4 0 0 0-3-3.87"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 3.13a4 4 0 0 1 0 7.75"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Players</span>
        </button>
      </nav>
    </div>
  );
}
