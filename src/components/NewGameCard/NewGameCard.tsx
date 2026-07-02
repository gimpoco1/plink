import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AVATAR_COLORS } from "../../constants";
import type { PlayerProfile, ScoreDirection, WinCondition } from "../../types";
import { avatarStyleFor } from "../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../utils/text";
import { GAME_PRESETS, type GamePreset } from "./gamePresets";
import { NewPlayerComposer } from "../NewPlayerComposer/NewPlayerComposer";
import "./NewGameCard.css";
import {
  ArrowDownUp,
  Check,
  Dices,
  Flag,
  Info,
  Library,
  Search,
  Timer,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
type StagedPlayer = {
  name: string;
  avatarColor: string;
};

export type NewGameInput = {
  name: string;
  scoreDirection: ScoreDirection;
  startingScore: number;
  targetScore: number;
  winCondition: WinCondition;
  winByTwo: boolean;
  manualEndOnly: boolean;
  timerEnabled: boolean;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
  initialPlayers: { name: string; avatarColor: string; profileId?: string }[];
};

type NewGameCardProps = {
  open: boolean;
  profiles: PlayerProfile[];
  isAuthenticated: boolean;
  draft?: NewGameInput | null;
  draftToken?: number;
  onOpenChange: (open: boolean) => void;
  onOpenAuth: () => void;
  onCreate: (input: NewGameInput) => boolean | Promise<boolean>;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
};

function normalizePlayerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function NewGameCard({
  open,
  profiles,
  isAuthenticated,
  draft,
  draftToken,
  onOpenChange,
  onOpenAuth,
  onCreate,
  onUpsertProfile,
}: NewGameCardProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("8");
  const [scoreDirection, setScoreDirection] = useState<ScoreDirection>("up");
  const [winCondition, setWinCondition] =
    useState<WinCondition>("reach_target");
  const [winByTwo, setWinByTwo] = useState(false);
  const [manualEndOnly, setManualEndOnly] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">(
    "countdown",
  );
  const [timerMinutes, setTimerMinutes] = useState("5");
  const [timerSeconds, setTimerSeconds] = useState("0");
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set(),
  );
  const [stagedPlayers, setStagedPlayers] = useState<StagedPlayer[]>([]);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isSavedPickerOpen, setIsSavedPickerOpen] = useState(false);
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");
  const [selectedPresetInfoId, setSelectedPresetInfoId] = useState<
    string | null
  >(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [saveAsProfile, setSaveAsProfile] = useState(true);
  const [newPlayerColor, setNewPlayerColor] = useState<
    (typeof AVATAR_COLORS)[number]["value"]
  >(AVATAR_COLORS[0].value);
  const presetBrowserRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  function resetForm() {
    setName("");
    setTarget("8");
    setScoreDirection("up");
    setWinCondition("reach_target");
    setWinByTwo(false);
    setManualEndOnly(false);
    setTimerEnabled(false);
    setTimerMode("countdown");
    setTimerMinutes("5");
    setTimerSeconds("0");
    setSelectedProfileIds(new Set());
    setStagedPlayers([]);
    setIsAddingPlayer(false);
    setIsSavedPickerOpen(false);
    setIsPresetBrowserOpen(false);
    setPresetSearch("");
    setSelectedPresetInfoId(null);
    setNewPlayerName("");
    setSaveAsProfile(true);
    setNewPlayerColor(AVATAR_COLORS[0].value);
  }

  const parsedTarget = Number.parseInt(target, 10);
  const parsedTimerMinutes = Number.parseInt(timerMinutes, 10);
  const parsedTimerSeconds = Number.parseInt(timerSeconds, 10);
  const timerTotalSeconds =
    (Number.isFinite(parsedTimerMinutes)
      ? Math.max(0, parsedTimerMinutes)
      : 0) *
      60 +
    (Number.isFinite(parsedTimerSeconds)
      ? Math.max(0, Math.min(59, parsedTimerSeconds))
      : 0);

  const selectedPlayers = useMemo(() => {
    const saved = profiles
      .filter((profile) => selectedProfileIds.has(profile.id))
      .map((profile) => ({
        id: profile.id,
        name: profile.name,
        avatarColor: profile.avatarColor,
        stagedIndex: null,
      }));
    const staged = stagedPlayers.map((player, stagedIndex) => ({
      id: `staged-${stagedIndex}`,
      ...player,
      stagedIndex,
    }));
    return [...saved, ...staged];
  }, [profiles, selectedProfileIds, stagedPlayers]);

  const lowScoreNeedsMorePlayers =
    winCondition === "lowest" && selectedPlayers.length < 2;
  const winByTwoNeedsMorePlayers = winByTwo && selectedPlayers.length < 2;
  const ruleNeedsMorePlayers =
    lowScoreNeedsMorePlayers || winByTwoNeedsMorePlayers;

  const canCreate =
    name.trim().length > 0 &&
    Number.isFinite(parsedTarget) &&
    (manualEndOnly || parsedTarget > 0) &&
    (!timerEnabled || timerMode === "stopwatch" || timerTotalSeconds > 0) &&
    selectedPlayers.length > 0 &&
    !ruleNeedsMorePlayers;

  const availableProfiles = useMemo(
    () => profiles.filter((profile) => !selectedProfileIds.has(profile.id)),
    [profiles, selectedProfileIds],
  );

  const newPlayerValidationMessage = useMemo(() => {
    const normalizedName = normalizePlayerName(newPlayerName);
    if (!normalizedName) return undefined;

    return selectedPlayers.some(
      (player) => normalizePlayerName(player.name) === normalizedName,
    )
      ? "This game already has a player with that name."
      : undefined;
  }, [newPlayerName, selectedPlayers]);

  useEffect(() => {
    if (!draft) return;

    setName(draft.name);
    setTarget(
      String(
        draft.winCondition === "reach_zero"
          ? draft.startingScore
          : draft.targetScore,
      ),
    );
    setScoreDirection(draft.scoreDirection);
    setWinCondition(draft.winCondition);
    setWinByTwo(draft.winByTwo);
    setManualEndOnly(draft.manualEndOnly);
    setTimerEnabled(draft.timerEnabled);
    setTimerMode(draft.timerMode);
    setTimerMinutes(String(Math.floor(draft.timerSeconds / 60)));
    setTimerSeconds(String(draft.timerSeconds % 60));
    setSelectedProfileIds(
      new Set(
        draft.initialPlayers
          .map((player) => player.profileId)
          .filter(
            (profileId): profileId is string =>
              !!profileId &&
              profiles.some((profile) => profile.id === profileId),
          ),
      ),
    );
    setStagedPlayers(
      draft.initialPlayers
        .filter(
          (player) =>
            !player.profileId ||
            !profiles.some((profile) => profile.id === player.profileId),
        )
        .map((player) => ({
          name: player.name,
          avatarColor: player.avatarColor,
        })),
    );
    setIsAddingPlayer(false);
    setIsSavedPickerOpen(false);
    setIsPresetBrowserOpen(false);
    setPresetSearch("");
    setSelectedPresetInfoId(null);
  }, [draft, draftToken, profiles]);

  useEffect(() => {
    if (!isPresetBrowserOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target || presetBrowserRef.current?.contains(target)) return;
      setIsPresetBrowserOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPresetBrowserOpen]);

  const filteredGamePresets = useMemo(() => {
    const query = presetSearch.trim().toLocaleLowerCase();
    if (!query) return GAME_PRESETS;

    return GAME_PRESETS.filter((preset) => {
      const haystack = [
        preset.name,
        preset.category,
        preset.description,
        preset.winCondition === "reach_zero"
          ? preset.startingScore
          : preset.targetScore,
        preset.winCondition === "lowest"
          ? "lowest wins"
          : preset.winCondition === "reach_zero"
            ? "reach zero"
            : preset.winByTwo
              ? "win by 2"
              : "highest wins",
        preset.timerEnabled ? "timer" : "no timer",
      ]
        .join(" ")
        .toLocaleLowerCase();
      return haystack.includes(query);
    });
  }, [presetSearch]);
  function toggleProfile(profileId: string) {
    setSelectedProfileIds((current) => {
      const next = new Set(current);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function updateTarget(value: string) {
    const digits = value.replace(/[^\d]/g, "");
    setTarget(
      digits ? String(Math.min(5000, Number.parseInt(digits, 10))) : "",
    );
  }

  function adjustTarget(delta: number) {
    const base =
      Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 8;
    setTarget(String(Math.min(5000, Math.max(1, base + delta))));
  }

  function applyCountdownPreset(totalSeconds: number) {
    setTimerMode("countdown");
    setTimerMinutes(String(Math.floor(totalSeconds / 60)));
    setTimerSeconds(String(totalSeconds % 60));
  }

  function applyGamePreset(preset: GamePreset) {
    setName(preset.name);
    setTarget(
      String(
        preset.winCondition === "reach_zero"
          ? preset.startingScore
          : preset.targetScore,
      ),
    );
    setScoreDirection(preset.scoreDirection);
    setWinCondition(preset.winCondition);
    setWinByTwo(preset.winByTwo);
    setManualEndOnly(preset.manualEndOnly);
    setTimerEnabled(preset.timerEnabled);
    setTimerMode(preset.timerMode);
    setTimerMinutes(String(Math.floor(preset.timerSeconds / 60)));
    setTimerSeconds(String(preset.timerSeconds % 60));
    setIsPresetBrowserOpen(false);
    setSelectedPresetInfoId(null);
  }

  function addPlayer() {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName || newPlayerValidationMessage) return;

    if (isAuthenticated && saveAsProfile) {
      const profile = onUpsertProfile(trimmedName, newPlayerColor);
      if (profile) {
        setSelectedProfileIds((current) => new Set([...current, profile.id]));
      } else {
        setStagedPlayers((current) => [
          ...current,
          { name: trimmedName, avatarColor: newPlayerColor },
        ]);
      }
    } else {
      setStagedPlayers((current) => [
        ...current,
        { name: trimmedName, avatarColor: newPlayerColor },
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

  async function startGame() {
    if (!canCreate) return;
    const savedPlayers = profiles
      .filter((profile) => selectedProfileIds.has(profile.id))
      .map((profile) => ({
        name: profile.name,
        avatarColor: profile.avatarColor,
        profileId: profile.id,
      }));

    const created = await onCreate({
      name,
      scoreDirection,
      startingScore: scoreDirection === "down" ? parsedTarget : 0,
      targetScore: winCondition === "reach_zero" ? 0 : parsedTarget,
      winCondition,
      winByTwo,
      manualEndOnly,
      timerEnabled,
      timerMode,
      timerSeconds:
        timerMode === "countdown" ? Math.max(1, timerTotalSeconds) : 300,
      initialPlayers: [...savedPlayers, ...stagedPlayers],
    });
    if (created) resetForm();
  }

  const sectionVariants = {
    closed: {
      opacity: 0,
      y: reduceMotion ? 0 : 14,
      scale: reduceMotion ? 1 : 0.985,
      filter: reduceMotion ? "none" : "blur(3px)",
    },
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
    },
  };

  const sectionTransition = reduceMotion
    ? { duration: 0 }
    : {
        type: "spring" as const,
        stiffness: 270,
        damping: 24,
        mass: 0.72,
      };

  const panelTransition = reduceMotion
    ? { duration: 0 }
    : {
        type: "spring" as const,
        stiffness: 220,
        damping: 24,
        mass: 0.9,
      };

  const bodyTransition = reduceMotion
    ? { duration: 0 }
    : {
        height: {
          type: "spring" as const,
          stiffness: 210,
          damping: 25,
          mass: 0.9,
        },
        opacity: { duration: 0.18, ease: "easeOut" as const },
        y: { type: "spring" as const, stiffness: 260, damping: 24, mass: 0.7 },
        scale: {
          type: "spring" as const,
          stiffness: 260,
          damping: 24,
          mass: 0.7,
        },
        paddingBottom: {
          type: "spring" as const,
          stiffness: 210,
          damping: 25,
          mass: 0.9,
        },
      };

  const staggerVariants = {
    closed: {},
    open: {
      transition: reduceMotion
        ? { staggerChildren: 0, delayChildren: 0 }
        : {
            staggerChildren: 0.055,
            delayChildren: 0.08,
          },
    },
  };

  return (
    <motion.div
      layout={hasMounted}
      transition={hasMounted ? panelTransition : { duration: 0 }}
      className={`newGamePanel${open ? " newGamePanel--open" : ""}`}
    >
      <motion.button
        layout={hasMounted}
        className={`btn btn--primary btn--xl homeHero__action newGamePanel__trigger${open ? " newGamePanel__trigger--open" : ""}`}
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        whileHover={
          reduceMotion || open
            ? undefined
            : { y: -1, boxShadow: "0 14px 32px rgba(216, 255, 79, 0.18)" }
        }
      >
        <motion.span
          className="newGamePanel__triggerIcon"
          aria-hidden="true"
          animate={
            open && !reduceMotion ? { rotate: 90, y: -4 } : { rotate: 0, y: -2 }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 360, damping: 22 }
          }
        >
          +
        </motion.span>
        <span className="newGamePanel__triggerCopy">
          <strong>New game</strong>
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="newGamePanel__body"
            key="new-game-body"
            initial={
              !hasMounted || reduceMotion
                ? false
                : {
                    height: 0,
                    opacity: 0,
                    y: -10,
                    scale: 0.985,
                    paddingBottom: 0,
                  }
            }
            animate={{
              height: "auto",
              opacity: 1,
              y: 0,
              scale: 1,
              paddingBottom: 12,
            }}
            exit={
              reduceMotion
                ? { height: 0, opacity: 0, paddingBottom: 0 }
                : {
                    height: 0,
                    opacity: 0,
                    y: -8,
                    scale: 0.985,
                    paddingBottom: 0,
                  }
            }
            transition={bodyTransition}
          >
            <motion.div
              className="homeForm homeForm--newSession"
              variants={staggerVariants}
              initial={reduceMotion ? false : "closed"}
              animate="open"
            >
              <motion.header
                className="newSessionHeader"
                variants={sectionVariants}
                transition={sectionTransition}
              >
                <div className="newSessionHeader__copy">
                  <div className="newSessionHeader__eyebrow">New session</div>
                  <div className="newSessionHeader__choice">
                    <div className="newSessionHeader__manual">
                      <span>Build the match</span>
                    </div>
                    <span className="newSessionHeader__or">or</span>
                    <button
                      type="button"
                      className="gamePresetBrowser__trigger"
                      aria-expanded={isPresetBrowserOpen}
                      onClick={() =>
                        setIsPresetBrowserOpen((current) => !current)
                      }
                    >
                      <Library size={15} strokeWidth={2.4} aria-hidden="true" />
                      Browse games
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {isPresetBrowserOpen ? (
                      <div
                        ref={presetBrowserRef}
                        className="gamePresetBrowserWrap"
                      >
                        <motion.section
                          className="gamePresetBrowser"
                          initial={
                            reduceMotion
                              ? false
                              : { opacity: 0, y: -6, scale: 0.98 }
                          }
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={
                            reduceMotion
                              ? { opacity: 0 }
                              : { opacity: 0, y: -6, scale: 0.98 }
                          }
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { duration: 0.16, ease: "easeOut" }
                          }
                          role="dialog"
                          aria-label="Browse game presets"
                        >
                          <label className="gamePresetBrowser__search">
                            <Search
                              size={16}
                              strokeWidth={2.4}
                              aria-hidden="true"
                            />
                            <input
                              value={presetSearch}
                              placeholder="Search cards, sports, pub games"
                              onChange={(event) =>
                                setPresetSearch(event.target.value)
                              }
                            />
                          </label>
                          <p className="gamePresetBrowser__hint">
                            Pick a game. Edit anything after.
                          </p>
                          <div className="gamePresetBrowser__list">
                            {filteredGamePresets.length > 0 ? (
                              filteredGamePresets.map((preset) => (
                                <Fragment key={preset.id}>
                                <button
                                  type="button"
                                  className="gamePresetCard"
                                  onClick={() => applyGamePreset(preset)}
                                >
                                  <span className="gamePresetCard__main">
                                    <strong>{preset.name}</strong>
                                    <span className="gamePresetCard__category">
                                      <span>{preset.category}</span>
                                      <button
                                        className="gamePresetCard__info"
                                        type="button"
                                        aria-label={`Show ${preset.name} scoring reminder`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedPresetInfoId((current) =>
                                            current === preset.id
                                              ? null
                                              : preset.id,
                                          );
                                        }}
                                      >
                                        <Info
                                          size={14}
                                          strokeWidth={2.6}
                                          aria-hidden="true"
                                        />
                                      </button>
                                    </span>
                                  </span>
                                  <span className="gamePresetCard__facts">
                                    <span>
                                      {preset.winCondition === "reach_zero"
                                        ? `${preset.startingScore} start`
                                        : `${preset.targetScore} pts`}
                                    </span>
                                    <span>
                                      {preset.winCondition === "lowest"
                                        ? "lowest wins"
                                        : preset.winCondition === "reach_zero"
                                          ? "reach zero"
                                          : preset.winByTwo
                                            ? "win by 2"
                                            : "highest wins"}
                                    </span>
                                    <span>
                                      {preset.timerEnabled
                                        ? "timer"
                                        : "no timer"}
                                    </span>
                                  </span>
                                  <span
                                    className="gamePresetCard__apply"
                                    aria-hidden="true"
                                  >
                                    <Check
                                      size={17}
                                      strokeWidth={2.4}
                                    />
                                  </span>
                                </button>
                                {selectedPresetInfoId === preset.id ? (
                                  <motion.aside
                                    className="gamePresetInfo"
                                    initial={
                                      reduceMotion
                                        ? false
                                        : { opacity: 0, y: -4, scale: 0.98 }
                                    }
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={
                                      reduceMotion
                                        ? { opacity: 0 }
                                        : { opacity: 0, y: -4, scale: 0.98 }
                                    }
                                    transition={
                                      reduceMotion
                                        ? { duration: 0 }
                                        : { duration: 0.14, ease: "easeOut" }
                                    }
                                  >
                                    <div className="gamePresetInfo__head">
                                      <div>
                                        <span>Rules reminder</span>
                                        <strong>{preset.name}</strong>
                                      </div>
                                      <button
                                        type="button"
                                        aria-label="Close scoring reminder"
                                        onClick={() =>
                                          setSelectedPresetInfoId(null)
                                        }
                                      >
                                        <X
                                          size={16}
                                          strokeWidth={2.5}
                                          aria-hidden="true"
                                        />
                                      </button>
                                    </div>
                                    <p>{preset.rulesNote}</p>
                                    <ul>
                                      {preset.rulesSummary.map((rule) => (
                                        <li key={rule}>{rule}</li>
                                      ))}
                                    </ul>
                                  </motion.aside>
                                ) : null}
                                </Fragment>
                              ))
                            ) : (
                              <div className="gamePresetBrowser__empty">
                                No preset matches that search.
                              </div>
                            )}
                          </div>
                        </motion.section>
                      </div>
                    ) : null}
                  </AnimatePresence>
                </div>
                <button
                  className="newSessionHeader__dismiss"
                  type="button"
                  aria-label="Close new game"
                  onClick={() => onOpenChange(false)}
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M5 5l10 10M15 5 5 15"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </motion.header>

              <motion.div
                className="newSessionPrimary"
                variants={sectionVariants}
                transition={sectionTransition}
              >
                <label className="field newSessionNameField">
                  <SectionLabel icon={<Dices size={16} strokeWidth={2.4} />}>
                    Game name
                  </SectionLabel>{" "}
                  <input
                    className="input input--featured"
                    value={name}
                    autoFocus={!isAddingPlayer}
                    placeholder="e.g. Tressette"
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <div className="targetControl">
                  <label className="targetControl__head">
                    <SectionLabel icon={<Target size={16} strokeWidth={2.4} />}>
                      {winCondition === "reach_zero"
                        ? "Start"
                        : manualEndOnly
                          ? "Ref"
                          : "Target"}
                    </SectionLabel>{" "}
                    <input
                      className="targetControl__value"
                      value={target}
                      min={1}
                      max={5000}
                      inputMode="numeric"
                      aria-label={
                        winCondition === "reach_zero"
                          ? "Starting score"
                          : manualEndOnly
                            ? "Reference target"
                          : "Target score"
                      }
                      onChange={(event) => updateTarget(event.target.value)}
                    />
                  </label>
                  <div className="targetControl__stepper">
                    <button
                      type="button"
                      className="targetControl__stepBtn"
                      aria-label={
                        winCondition === "reach_zero"
                          ? "Decrease starting score"
                          : "Decrease target score"
                      }
                      onClick={() => adjustTarget(-1)}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="targetControl__stepBtn"
                      aria-label={
                        winCondition === "reach_zero"
                          ? "Increase starting score"
                          : "Increase target score"
                      }
                      onClick={() => adjustTarget(1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.section
                className="newSessionPlayers"
                variants={sectionVariants}
                transition={sectionTransition}
              >
                <div className="newSessionPlayers__head">
                  <SectionLabel icon={<Users size={16} strokeWidth={2.4} />}>
                    Players
                  </SectionLabel>{" "}
                  <span className="newSessionPlayers__count">
                    {selectedPlayers.length}
                  </span>
                </div>
                {selectedPlayers.length > 0 ? (
                  <div className="selectedPlayers" aria-live="polite">
                    <div className="selectedPlayers__list">
                      {selectedPlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          className="selectedPlayerChip"
                          onClick={() => {
                            if (player.stagedIndex === null)
                              toggleProfile(player.id);
                            else
                              setStagedPlayers((current) =>
                                current.filter(
                                  (_, index) => index !== player.stagedIndex,
                                ),
                              );
                          }}
                        >
                          <span
                            className="selectedPlayerChip__avatar"
                            style={avatarStyleFor(player.avatarColor)}
                          >
                            {getInitials(player.name)}
                          </span>
                          <span className="selectedPlayerChip__name">
                            {profiles.some(
                              (profile) =>
                                profile.id === player.id &&
                                profile.isAccountPlayer,
                            )
                              ? formatAccountPlayerName(player.name)
                              : player.name}
                          </span>
                          <span className="selectedPlayerChip__action">×</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="profilePicker__list">
                  {availableProfiles.length > 0 ? (
                    <div className="savedPlayerPicker">
                      <button
                        type="button"
                        className="savedPlayerPicker__toggle"
                        aria-expanded={isSavedPickerOpen}
                        onClick={() => setIsSavedPickerOpen((value) => !value)}
                      >
                        <span className="savedPlayerPicker__copy">
                          <strong>Saved players</strong>
                          <span>
                            Select existing players to add to this game
                          </span>
                        </span>
                        <span className="savedPlayerPicker__count">
                          {availableProfiles.length}
                        </span>
                      </button>
                      {isSavedPickerOpen ? (
                        <div className="savedPlayerPicker__options">
                          {availableProfiles.map((profile) => (
                            <button
                              key={profile.id}
                              type="button"
                              className="profileOption"
                              onClick={() => toggleProfile(profile.id)}
                            >
                              <span
                                className="profileOption__avatar"
                                style={avatarStyleFor(profile.avatarColor)}
                              >
                                {getInitials(profile.name)}
                              </span>
                              <span className="profileOption__copy">
                                <span className="profileOption__name">
                                  {profile.isAccountPlayer
                                    ? formatAccountPlayerName(profile.name)
                                    : profile.name}
                                </span>
                                <span className="profileOption__hint">
                                  Tap to add
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <NewPlayerComposer
                    isOpen={isAddingPlayer}
                    isAuthenticated={isAuthenticated}
                    name={newPlayerName}
                    color={newPlayerColor}
                    saveAsProfile={saveAsProfile}
                    validationMessage={newPlayerValidationMessage}
                    onOpen={() => setIsAddingPlayer(true)}
                    onOpenAuth={onOpenAuth}
                    onCancel={() => setIsAddingPlayer(false)}
                    onAdd={addPlayer}
                    onNameChange={setNewPlayerName}
                    onColorChange={setNewPlayerColor}
                    onSaveAsProfileChange={setSaveAsProfile}
                  />
                </div>
              </motion.section>

              <motion.div
                className="newSessionOptions"
                variants={sectionVariants}
                transition={sectionTransition}
              >
                <ModeButton
                  icon={<ArrowDownUp size={22} strokeWidth={2.3} />}
                  title="Lowest wins"
                  description="Lowest score wins."
                  active={winCondition === "lowest"}
                  onClick={() => {
                    setScoreDirection("up");
                    setWinCondition((value) =>
                      value === "lowest" ? "reach_target" : "lowest",
                    );
                  }}
                />
                <ModeButton
                  icon={<Trophy size={22} strokeWidth={2.3} />}
                  title="Win by 2"
                  description="Leader needs a 2 point gap."
                  active={winByTwo}
                  onClick={() => {
                    if (winCondition === "reach_zero") return;
                    setScoreDirection("up");
                    setWinByTwo((value) => !value);
                  }}
                />
                <ModeButton
                  icon={<Flag size={22} strokeWidth={2.3} />}
                  title="Manual finish"
                  description="End from the game menu."
                  active={manualEndOnly}
                  onClick={() => setManualEndOnly((value) => !value)}
                />
                <ModeButton
                  icon={<Timer size={22} strokeWidth={2.3} />}
                  title="Timer"
                  description={
                    timerEnabled
                      ? timerMode === "stopwatch"
                        ? "Stopwatch active"
                        : `${timerMinutes || "0"}m ${timerSeconds || "0"}s`
                      : "No timer for this game."
                  }
                  active={timerEnabled}
                  onClick={() => setTimerEnabled((value) => !value)}
                />
              </motion.div>

              {ruleNeedsMorePlayers ? (
                <motion.p
                  className="newSessionRuleHint"
                  role="status"
                  aria-live="polite"
                  variants={sectionVariants}
                  transition={sectionTransition}
                >
                  {lowScoreNeedsMorePlayers
                    ? "Reverse scoring mode requires at least 2 players."
                    : "Win by 2 requires at least 2 players."}
                </motion.p>
              ) : null}

              {timerEnabled ? (
                <motion.div
                  className="timerPanel"
                  variants={sectionVariants}
                  transition={sectionTransition}
                >
                  <div
                    className="timerPanel__modes"
                    role="tablist"
                    aria-label="Timer mode"
                  >
                    <TimerChoice
                      active={timerMode === "countdown"}
                      onClick={() => setTimerMode("countdown")}
                    >
                      Countdown
                    </TimerChoice>
                    <TimerChoice
                      active={timerMode === "stopwatch"}
                      onClick={() => setTimerMode("stopwatch")}
                    >
                      Stopwatch
                    </TimerChoice>
                  </div>
                  {timerMode === "countdown" ? (
                    <div className="timerPanel__countdownRow">
                      <div className="timerPanel__presets">
                        {[60, 180, 300, 600].map((seconds) => (
                          <button
                            key={seconds}
                            type="button"
                            className={`timerPanel__preset${timerTotalSeconds === seconds ? " timerPanel__preset--active" : ""}`}
                            onClick={() => applyCountdownPreset(seconds)}
                          >
                            {seconds / 60}m
                          </button>
                        ))}
                      </div>
                      <div className="timerPanel__inputs">
                        <TimerInput
                          label="Min"
                          value={timerMinutes}
                          onChange={setTimerMinutes}
                        />
                        <TimerInput
                          label="Sec"
                          value={timerSeconds}
                          onChange={setTimerSeconds}
                          max={59}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="timerPanel__note">
                      Stopwatch starts at 0 and counts up.
                    </div>
                  )}
                </motion.div>
              ) : null}

              <motion.button
                className="btn btn--primary btn--wide btn--xl newSessionStart"
                type="button"
                disabled={!canCreate}
                onClick={() => void startGame()}
                variants={sectionVariants}
                transition={sectionTransition}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                whileHover={
                  reduceMotion ? undefined : canCreate ? { y: -1 } : undefined
                }
              >
                Start Game
              </motion.button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="sectionLabel">
      <span className="sectionLabel__icon" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}

function ModeButton({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`modeCard${active ? " modeCard--active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="modeCard__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="modeCard__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
    </button>
  );
}

function TimerChoice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`timerPanel__modeBtn${active ? " timerPanel__modeBtn--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TimerInput({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
}) {
  return (
    <label className="field timerNumberField">
      <span className="timerNumberField__label">{label}</span>
      <input
        className="input timerNumberField__input"
        value={value}
        inputMode="numeric"
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, "");
          if (!digits) {
            onChange("");
            return;
          }

          const numeric = Number.parseInt(digits, 10);
          onChange(
            String(max !== undefined ? Math.min(max, numeric) : numeric),
          );
        }}
      />
    </label>
  );
}
