import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AVATAR_COLORS, DEFAULT_TEAM_ICON } from "../../constants";
import type {
  GameTeam,
  PlayerProfile,
  ScoreDirection,
  TeamMember,
  WinCondition,
} from "../../types";
import { avatarStyleFor } from "../../utils/color";
import {
  formatAccountPlayerName,
  formatPlayerName,
  getInitials,
} from "../../utils/text";
import { GAME_PRESETS, type GamePreset } from "./gamePresets";
import { NewPlayerComposer } from "../NewPlayerComposer/NewPlayerComposer";
import { SearchableRosterPicker } from "../SearchableRosterPicker/SearchableRosterPicker";
import "./NewGameCard.css";
import {
  ArrowDownUp,
  Check,
  Dices,
  Dumbbell,
  Flag,
  Flame,
  Info,
  Library,
  Plus,
  Search,
  Shield,
  Star,
  Timer,
  Target,
  Trophy,
  Users,
  X,
  Zap,
  Boxes,
} from "lucide-react";
import {
  areLocalPlayersEqual,
  loadLocalPlayers,
  saveLocalPlayers,
  LOCAL_PLAYERS_CHANGED_EVENT,
  type LocalPlayer,
} from "../../storage/localPlayers";

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

type StagedPlayer = LocalPlayer;

export type NewGameInput = {
  name: string;
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
  initialPlayers: { name: string; avatarColor: string; profileId?: string }[];
  initialTeams?: Array<{
    id: string;
    name: string;
    icon?: string;
    members: Array<{ name: string; avatarColor: string; profileId?: string }>;
  }>;
};

type NewGameCardProps = {
  open: boolean;
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  canUseTeams: boolean;
  isAuthenticated: boolean;
  draft?: NewGameInput | null;
  draftToken?: number;
  onOpenChange: (open: boolean) => void;
  onOpenAuth: () => void;
  onOpenProFeatureAuth: () => void;
  onOpenProPlan: () => void;
  onOpenTeamsTab: (draft: NewGameInput) => void;
  onCreate: (input: NewGameInput) => boolean | Promise<boolean>;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
};

function normalizePlayerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function useScrollableListFade(dependencies: ReadonlyArray<unknown>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [fadeState, setFadeState] = useState({ top: false, bottom: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      setFadeState({ top: false, bottom: false });
      return;
    }

    const updateFade = () => {
      const top = node.scrollTop > 6;
      const remainingScroll =
        node.scrollHeight - node.clientHeight - node.scrollTop;
      const bottom = remainingScroll > 6;
      setFadeState({ top, bottom });
    };

    updateFade();

    node.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateFade())
        : null;
    resizeObserver?.observe(node);

    return () => {
      node.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
      resizeObserver?.disconnect();
    };
  }, dependencies);

  return { ref, fadeState };
}

export function NewGameCard({
  open,
  profiles,
  teams,
  teamMembers,
  canUseTeams,
  isAuthenticated,
  draft,
  draftToken,
  onOpenChange,
  onOpenAuth,
  onOpenProFeatureAuth,
  onOpenProPlan,
  onOpenTeamsTab,
  onCreate,
  onUpsertProfile,
}: NewGameCardProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("8");
  const [participantMode, setParticipantMode] = useState<"players" | "teams">(
    "players",
  );
  const [scoreDirection, setScoreDirection] = useState<ScoreDirection>("up");
  const [winCondition, setWinCondition] =
    useState<WinCondition>("reach_target");
  const [winByTwo, setWinByTwo] = useState(false);
  const [manualEndOnly, setManualEndOnly] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [diceEnabled, setDiceEnabled] = useState(false);
  const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">(
    "countdown",
  );
  const [timerMinutes, setTimerMinutes] = useState("5");
  const [timerSeconds, setTimerSeconds] = useState("0");
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    new Set(),
  );
  const [stagedPlayers, setStagedPlayers] =
    useState<StagedPlayer[]>(loadLocalPlayers);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
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
  const bodyInnerRef = useRef<HTMLDivElement | null>(null);
  const appliedDraftKeyRef = useRef<string | null>(null);
  const hasLoadedLocalPlayersRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const [bodyContentHeight, setBodyContentHeight] = useState(0);
  const [selectedStagedPlayerIds, setSelectedStagedPlayerIds] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useLayoutEffect(() => {
    const node = bodyInnerRef.current;
    if (!node) return;

    const measure = () => {
      setBodyContentHeight(node.scrollHeight);
    };

    measure();
    window.addEventListener("resize", measure);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", measure);
      };
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);

    return () => {
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalPlayersRef.current) {
      hasLoadedLocalPlayersRef.current = true;
      return;
    }

    saveLocalPlayers(stagedPlayers);
  }, [stagedPlayers]);

  useEffect(() => {
    function refreshLocalPlayers() {
      const nextPlayers = loadLocalPlayers();
      const nextPlayerIds = new Set(nextPlayers.map((player) => player.id));

      setStagedPlayers((current) =>
        areLocalPlayersEqual(current, nextPlayers) ? current : nextPlayers,
      );

      setSelectedStagedPlayerIds((current) => {
        const next = new Set<string>();

        current.forEach((playerId) => {
          if (nextPlayerIds.has(playerId)) {
            next.add(playerId);
          }
        });

        return next;
      });
    }

    window.addEventListener(LOCAL_PLAYERS_CHANGED_EVENT, refreshLocalPlayers);
    window.addEventListener("storage", refreshLocalPlayers);
    window.addEventListener("focus", refreshLocalPlayers);

    return () => {
      window.removeEventListener(
        LOCAL_PLAYERS_CHANGED_EVENT,
        refreshLocalPlayers,
      );
      window.removeEventListener("storage", refreshLocalPlayers);
      window.removeEventListener("focus", refreshLocalPlayers);
    };
  }, []);

  function resetForm() {
    setName("");
    setTarget("8");
    setParticipantMode("players");
    setScoreDirection("up");
    setWinCondition("reach_target");
    setWinByTwo(false);
    setManualEndOnly(false);
    setTimerEnabled(false);
    setDiceEnabled(false);
    setTimerMode("countdown");
    setTimerMinutes("5");
    setTimerSeconds("0");
    setSelectedProfileIds(new Set());
    setSelectedTeamIds(new Set());
    setIsAddingPlayer(false);
    setParticipantSearch("");
    setIsPresetBrowserOpen(false);
    setPresetSearch("");
    setSelectedPresetInfoId(null);
    setNewPlayerName("");
    setSaveAsProfile(true);
    setNewPlayerColor(AVATAR_COLORS[0].value);
    setSelectedStagedPlayerIds(new Set());
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

    const staged = stagedPlayers
      .filter((player) => selectedStagedPlayerIds.has(player.id))
      .map((player, stagedIndex) => ({
        id: player.id,
        name: player.name,
        avatarColor: player.avatarColor,
        stagedIndex,
      }));

    return [...saved, ...staged];
  }, [profiles, selectedProfileIds, stagedPlayers, selectedStagedPlayerIds]);

  const selectedStagedPlayers = useMemo(
    () =>
      stagedPlayers.filter((player) => selectedStagedPlayerIds.has(player.id)),
    [stagedPlayers, selectedStagedPlayerIds],
  );
  const visibleStagedPlayers = useMemo(
    () =>
      isAuthenticated
        ? stagedPlayers.filter((player) => selectedStagedPlayerIds.has(player.id))
        : stagedPlayers,
    [isAuthenticated, stagedPlayers, selectedStagedPlayerIds],
  );
  const selectedStagedPlayersForGame = useMemo(
    () =>
      selectedStagedPlayers.map((player) => ({
        name: player.name,
        avatarColor: player.avatarColor,
        profileId: player.id,
      })),
    [selectedStagedPlayers],
  );

  function toggleStagedPlayer(playerId: string) {
    setSelectedStagedPlayerIds((current) => {
      const next = new Set(current);

      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }

      return next;
    });
  }

  const draftTeamPriorityIds = useMemo(
    () =>
      draft?.participantMode === "teams"
        ? (draft.initialTeams ?? []).map((team) => team.id)
        : [],
    [draft],
  );
  const membersByTeamId = useMemo(() => {
    const map = new Map<string, PlayerProfile[]>();
    const profilesById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );
    teamMembers.forEach((member) => {
      const profile = profilesById.get(member.profileId);
      if (!profile) return;
      const next = map.get(member.teamId) ?? [];
      next.push(profile);
      map.set(member.teamId, next);
    });
    return map;
  }, [profiles, teamMembers]);
  const availableTeams = useMemo(() => {
    const priority = new Map(
      draftTeamPriorityIds.map((teamId, index) => [teamId, index]),
    );

    return teams
      .map((team, index) => ({
        ...team,
        listIndex: index,
        members: (membersByTeamId.get(team.id) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      }))
      .filter((team) => team.members.length > 0)
      .sort((left, right) => {
        const leftPriority = priority.get(left.id) ?? Number.POSITIVE_INFINITY;
        const rightPriority =
          priority.get(right.id) ?? Number.POSITIVE_INFINITY;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return left.listIndex - right.listIndex;
      });
  }, [draftTeamPriorityIds, membersByTeamId, teams]);
  const selectedTeams = useMemo(
    () => availableTeams.filter((team) => selectedTeamIds.has(team.id)),
    [availableTeams, selectedTeamIds],
  );
  const participantCount =
    participantMode === "teams" ? selectedTeams.length : selectedPlayers.length;
  const canAccessTeamsMode = isAuthenticated && canUseTeams;

  const lowScoreNeedsMorePlayers =
    winCondition === "lowest" && participantCount < 2;
  const winByTwoNeedsMorePlayers = winByTwo && participantCount < 2;
  const ruleNeedsMorePlayers =
    lowScoreNeedsMorePlayers || winByTwoNeedsMorePlayers;

  const canCreate =
    name.trim().length > 0 &&
    Number.isFinite(parsedTarget) &&
    (manualEndOnly || parsedTarget > 0) &&
    (!timerEnabled || timerMode === "stopwatch" || timerTotalSeconds > 0) &&
    participantCount > 0 &&
    (participantMode !== "teams" || (isAuthenticated && canUseTeams)) &&
    !ruleNeedsMorePlayers;

  useEffect(() => {
    if (participantMode === "teams" && !canAccessTeamsMode) {
      setParticipantMode("players");
    }
  }, [canAccessTeamsMode, participantMode]);

  const newPlayerValidationMessage = useMemo(() => {
    const normalizedName = normalizePlayerName(newPlayerName);
    if (!normalizedName) return undefined;
    const alreadyExists =
      profiles.some(
        (profile) => normalizePlayerName(profile.name) === normalizedName,
      ) ||
      stagedPlayers.some(
        (player) => normalizePlayerName(player.name) === normalizedName,
      );

    return alreadyExists
      ? "A player with that name already exists."
      : undefined;
  }, [newPlayerName, profiles, stagedPlayers]);

  const filteredProfiles = useMemo(() => {
    const query = participantSearch.trim().toLocaleLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) =>
      profile.name.toLocaleLowerCase().includes(query),
    );
  }, [participantSearch, profiles]);

  const filteredTeams = useMemo(() => {
    const query = participantSearch.trim().toLocaleLowerCase();
    if (!query) return availableTeams;
    return availableTeams.filter((team) => {
      if (team.name.toLocaleLowerCase().includes(query)) return true;
      return team.members.some((member) =>
        member.name.toLocaleLowerCase().includes(query),
      );
    });
  }, [availableTeams, participantSearch]);

  const teamListFade = useScrollableListFade([
    participantMode,
    participantSearch,
    filteredTeams.length,
    availableTeams.length,
    selectedTeamIds.size,
  ]);

  const stagedPlayerListFade = useScrollableListFade([
    participantMode,
    visibleStagedPlayers.length,
  ]);

  useEffect(() => {
    if (!draft) {
      appliedDraftKeyRef.current = null;
      return;
    }

    const draftKey = JSON.stringify({
      token: draftToken ?? 0,
      name: draft.name,
      participantMode: draft.participantMode,
      scoreDirection: draft.scoreDirection,
      startingScore: draft.startingScore,
      targetScore: draft.targetScore,
      winCondition: draft.winCondition,
      winByTwo: draft.winByTwo,
      manualEndOnly: draft.manualEndOnly,
      timerEnabled: draft.timerEnabled,
      diceEnabled: draft.diceEnabled ?? false,
      timerMode: draft.timerMode,
      timerSeconds: draft.timerSeconds,
      initialPlayers: draft.initialPlayers.map(
        (player) => player.profileId ?? player.name,
      ),
      initialTeams: (draft.initialTeams ?? []).map((team) => team.id),
    });

    if (appliedDraftKeyRef.current === draftKey) return;
    appliedDraftKeyRef.current = draftKey;

    setName(draft.name);
    setParticipantMode(draft.participantMode ?? "players");
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
    setDiceEnabled(draft.diceEnabled ?? false);
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
    const teamIdsByName = new Map(
      teams.map((team) => [team.name.toLowerCase(), team.id] as const),
    );
    setSelectedTeamIds(
      new Set(
        (draft.initialTeams ?? [])
          .map((team) => teamIdsByName.get(team.name.toLowerCase()) ?? team.id)
          .filter((teamId) =>
            availableTeams.some((availableTeam) => availableTeam.id === teamId),
          ),
      ),
    );
    const draftLocalPlayers = draft.initialPlayers
      .filter(
        (player) =>
          !player.profileId ||
          !profiles.some((profile) => profile.id === player.profileId),
      )
      .map((player) => {
        const now = Date.now();
        return {
          id: crypto.randomUUID(),
          name: player.name,
          avatarColor: player.avatarColor,
          createdAt: now,
          updatedAt: now,
        };
      });

    setStagedPlayers((current) => {
      const playersByName = new Map(
        current.map((player) => [normalizePlayerName(player.name), player]),
      );

      const merged = [...current];

      draftLocalPlayers.forEach((player) => {
        const key = normalizePlayerName(player.name);

        if (!playersByName.has(key)) {
          playersByName.set(key, player);
          merged.push(player);
        }
      });

      setSelectedStagedPlayerIds(
        new Set(
          draftLocalPlayers
            .map(
              (player) =>
                playersByName.get(normalizePlayerName(player.name))?.id,
            )
            .filter((id): id is string => !!id),
        ),
      );

      return merged;
    });
    setIsAddingPlayer(false);
    setParticipantSearch("");
    setIsPresetBrowserOpen(false);
    setPresetSearch("");
    setSelectedPresetInfoId(null);
  }, [availableTeams, draft, draftToken, profiles, teams]);

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
    setDiceEnabled(false);
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
        const now = Date.now();
        const localPlayer = {
          id: crypto.randomUUID(),
          name: trimmedName,
          avatarColor: newPlayerColor,
          createdAt: now,
          updatedAt: now,
        };

        setStagedPlayers((current) => [...current, localPlayer]);
        setSelectedStagedPlayerIds(
          (current) => new Set([...current, localPlayer.id]),
        );
      }
    } else {
      const now = Date.now();
      const localPlayer = {
        id: crypto.randomUUID(),
        name: trimmedName,
        avatarColor: newPlayerColor,
        createdAt: now,
        updatedAt: now,
      };

      setStagedPlayers((current) => [...current, localPlayer]);
      setSelectedStagedPlayerIds(
        (current) => new Set([...current, localPlayer.id]),
      );
    }

    setNewPlayerName("");
    setNewPlayerColor(
      AVATAR_COLORS[
        (profiles.length + stagedPlayers.length + 1) % AVATAR_COLORS.length
      ].value,
    );
    setIsAddingPlayer(false);
  }

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((current) => {
      const next = new Set(current);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  function switchParticipantMode(nextMode: "players" | "teams") {
    setParticipantMode(nextMode);
    setIsAddingPlayer(false);
  }

  function handleTeamsModePress() {
    if (canAccessTeamsMode) {
      switchParticipantMode("teams");
      return;
    }

    setIsAddingPlayer(false);
    if (!isAuthenticated) {
      onOpenProFeatureAuth();
      return;
    }

    onOpenProPlan();
  }

  function buildDraftState(): NewGameInput {
    const savedPlayers = profiles
      .filter((profile) => selectedProfileIds.has(profile.id))
      .map((profile) => ({
        name: profile.name,
        avatarColor: profile.avatarColor,
        profileId: profile.id,
      }));

    return {
      name,
      participantMode,
      scoreDirection,
      startingScore: scoreDirection === "down" ? parsedTarget || 0 : 0,
      targetScore: winCondition === "reach_zero" ? 0 : parsedTarget || 0,
      winCondition,
      winByTwo,
      manualEndOnly,
      timerEnabled,
      diceEnabled,
      timerMode,
      timerSeconds:
        timerMode === "countdown" ? Math.max(1, timerTotalSeconds || 0) : 300,
      initialPlayers: [...savedPlayers, ...selectedStagedPlayersForGame],
      initialTeams: selectedTeams.map((team) => ({
        id: team.id,
        name: team.name,
        icon: team.icon,
        members: team.members.map((member) => ({
          name: member.name,
          avatarColor: member.avatarColor,
          profileId: member.id,
        })),
      })),
    };
  }

  function openTeamsWorkspace() {
    onOpenTeamsTab(buildDraftState());
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
      participantMode,
      scoreDirection,
      startingScore: scoreDirection === "down" ? parsedTarget : 0,
      targetScore: winCondition === "reach_zero" ? 0 : parsedTarget,
      winCondition,
      winByTwo,
      manualEndOnly,
      timerEnabled,
      diceEnabled,
      timerMode,
      timerSeconds:
        timerMode === "countdown" ? Math.max(1, timerTotalSeconds) : 300,
      initialPlayers:
        participantMode === "teams"
          ? []
          : [...savedPlayers, ...selectedStagedPlayersForGame],
      initialTeams:
        participantMode === "teams"
          ? selectedTeams.map((team) => ({
              id: team.id,
              name: team.name,
              icon: team.icon,
              members: team.members.map((member) => ({
                name: member.name,
                avatarColor: member.avatarColor,
                profileId: member.id,
              })),
            }))
          : [],
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
    <motion.div className={`newGamePanel${open ? " newGamePanel--open" : ""}`}>
      <motion.button
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

      <div
        className={`newGamePanel__body${open ? " newGamePanel__body--open" : ""}`}
        aria-hidden={!open}
        style={
          hasMounted
            ? {
                height: open ? bodyContentHeight : 0,
                opacity: open ? 1 : 0,
                paddingBottom: open ? 20 : 0,
                transform: reduceMotion
                  ? "none"
                  : open
                    ? "translateY(0) scale(1)"
                    : "translateY(-8px) scale(0.985)",
              }
            : undefined
        }
      >
        <motion.div
          ref={bodyInnerRef}
          className="homeForm homeForm--newSession"
          variants={staggerVariants}
          initial={false}
          animate={reduceMotion ? undefined : open ? "open" : "closed"}
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
                  onClick={() => setIsPresetBrowserOpen((current) => !current)}
                >
                  <Library size={15} strokeWidth={2.4} aria-hidden="true" />
                  Browse games
                </button>
              </div>
              <AnimatePresence initial={false}>
                {isPresetBrowserOpen ? (
                  <div ref={presetBrowserRef} className="gamePresetBrowserWrap">
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
                                    {preset.timerEnabled ? "timer" : "no timer"}
                                  </span>
                                </span>
                                <span
                                  className="gamePresetCard__apply"
                                  aria-hidden="true"
                                >
                                  <Check size={17} strokeWidth={2.4} />
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
              <SectionLabel icon={<Boxes size={16} strokeWidth={2} />}>
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
            className={`newSessionPlayers${
              participantMode === "teams" ? " newSessionPlayers--teams" : ""
            }`}
            variants={sectionVariants}
            transition={sectionTransition}
          >
            <div className="newSessionPlayers__head">
              <SectionLabel icon={<Users size={16} strokeWidth={2.4} />}>
                Participants
              </SectionLabel>{" "}
              <span className="newSessionPlayers__count">
                {participantCount}
              </span>
            </div>
            <div
              className="participantModeSwitch"
              role="tablist"
              aria-label="Participant mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={participantMode === "players"}
                className={`participantModeSwitch__option${
                  participantMode === "players"
                    ? " participantModeSwitch__option--active"
                    : ""
                }`}
                onClick={() => switchParticipantMode("players")}
              >
                Individuals
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={participantMode === "teams"}
                aria-disabled={!canAccessTeamsMode}
                className={`participantModeSwitch__option${
                  participantMode === "teams"
                    ? " participantModeSwitch__option--active participantModeSwitch__option--teamsActive"
                    : ""
                }${
                  !canAccessTeamsMode
                    ? " participantModeSwitch__option--locked"
                    : ""
                }`}
                onClick={handleTeamsModePress}
              >
                Teams
                {!canAccessTeamsMode ? (
                  <span className="participantModeSwitch__badge">Pro</span>
                ) : null}
              </button>
            </div>
            {participantMode === "players" ? (
              <>
                <div className="profilePicker__list">
                  {visibleStagedPlayers.length > 0 ? (
                    <div
                      className={`participantPicker__listShell${
                        stagedPlayerListFade.fadeState.top
                          ? " participantPicker__listShell--fadeTop"
                          : ""
                      }${
                        stagedPlayerListFade.fadeState.bottom
                          ? " participantPicker__listShell--fadeBottom"
                          : ""
                      }`}
                    >
                      <div
                        ref={stagedPlayerListFade.ref}
                        className="participantPicker__list"
                      >
                        <div className="participantPicker__listContent">
                          {visibleStagedPlayers.map((player) => {
                            const selected = selectedStagedPlayerIds.has(
                              player.id,
                            );

                            return (
                              <button
                                key={player.id}
                                type="button"
                                className={`participantOption${
                                  selected ? " participantOption--active" : ""
                                }`}
                                onClick={() => toggleStagedPlayer(player.id)}
                              >
                                <span
                                  className="participantOption__avatar"
                                  style={avatarStyleFor(player.avatarColor)}
                                >
                                  {getInitials(player.name)}
                                </span>

                                <span className="participantOption__copy">
                                  <span className="participantOption__name">
                                    {formatPlayerName(player.name)}
                                  </span>
                                  <span className="participantOption__hint">
                                    Local player
                                  </span>
                                </span>

                                <SelectionStateIcon selected={selected} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <SearchableRosterPicker
                    variant="light"
                    className="participantPicker__group"
                    searchValue={participantSearch}
                    onSearchChange={setParticipantSearch}
                    searchPlaceholder="Search players"
                    searchAriaLabel="Search saved players"
                    clearAriaLabel="Clear player search"
                    showSearch={profiles.length > 0 || !!participantSearch}
                    showListImmediately
                    emptyState={
                      participantSearch
                        ? "No saved players match that search."
                        : visibleStagedPlayers.length === 0 &&
                            profiles.length === 0
                          ? "No saved players yet. Create one below."
                          : undefined
                    }
                    createButtonLabel="Add new player"
                    onCreateButtonClick={() => setIsAddingPlayer(true)}
                  >
                    {filteredProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        className={`participantOption${
                          selectedProfileIds.has(profile.id)
                            ? " participantOption--active"
                            : ""
                        }`}
                        onClick={() => toggleProfile(profile.id)}
                      >
                        <span
                          className="participantOption__avatar"
                          style={avatarStyleFor(profile.avatarColor)}
                        >
                          {getInitials(profile.name)}
                        </span>
                        <span className="participantOption__copy">
                          <span className="participantOption__name">
                            {profile.isAccountPlayer
                              ? formatAccountPlayerName(profile.name)
                              : profile.name}
                          </span>
                        </span>
                        <SelectionStateIcon
                          selected={selectedProfileIds.has(profile.id)}
                        />
                      </button>
                    ))}
                  </SearchableRosterPicker>
                  <NewPlayerComposer
                    isOpen={isAddingPlayer}
                    showTrigger={false}
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
              </>
            ) : (
              <div className="teamPicker">
                {!isAuthenticated ? (
                  <div className="teamPicker__empty">
                    Sign in to build games from saved teams.
                  </div>
                ) : !canUseTeams ? (
                  <div className="teamPicker__empty">
                    Team games are a Pro feature.
                  </div>
                ) : availableTeams.length > 0 ? (
                  <>
                    <label className="participantPicker__search participantPicker__search--teams">
                      <Search size={16} strokeWidth={2.4} aria-hidden="true" />
                      <input
                        type="text"
                        value={participantSearch}
                        onChange={(event) =>
                          setParticipantSearch(event.target.value)
                        }
                        placeholder="Search teams"
                        aria-label="Search saved teams"
                      />
                      {participantSearch ? (
                        <button
                          type="button"
                          className="participantPicker__clear"
                          aria-label="Clear team search"
                          onClick={() => setParticipantSearch("")}
                        >
                          <X size={15} strokeWidth={2.6} aria-hidden="true" />
                        </button>
                      ) : null}
                    </label>
                    <div
                      className={`participantPicker__listShell${
                        teamListFade.fadeState.top
                          ? " participantPicker__listShell--fadeTop"
                          : ""
                      }${
                        teamListFade.fadeState.bottom
                          ? " participantPicker__listShell--fadeBottom"
                          : ""
                      }`}
                    >
                      <div ref={teamListFade.ref} className="teamPicker__list">
                        <div className="participantPicker__listContent">
                          {filteredTeams.map((team) => (
                            <button
                              key={team.id}
                              type="button"
                              className={`teamPicker__option${
                                selectedTeamIds.has(team.id)
                                  ? " teamPicker__option--active"
                                  : ""
                              }`}
                              onClick={() => toggleTeam(team.id)}
                            >
                              <span className="teamPicker__optionHead">
                                <span className="teamPicker__optionIdentity">
                                  <span
                                    className="teamPicker__icon"
                                    aria-hidden="true"
                                  >
                                    <TeamIconGlyph
                                      icon={team.icon}
                                      size={19}
                                      strokeWidth={2.3}
                                    />
                                  </span>
                                  <span className="teamPicker__optionCopy">
                                    <strong>{team.name}</strong>
                                    <span>{team.members.length} players</span>
                                  </span>
                                </span>
                              </span>
                              <span
                                className="teamPicker__avatarsWrap"
                                aria-hidden="true"
                              >
                                <span className="teamPicker__avatars">
                                  {team.members.map((member) => (
                                    <span
                                      key={`${team.id}-${member.id}`}
                                      className="teamPicker__avatar"
                                      style={avatarStyleFor(member.avatarColor)}
                                    >
                                      {getInitials(member.name)}
                                    </span>
                                  ))}
                                </span>
                                <SelectionStateIcon
                                  selected={selectedTeamIds.has(team.id)}
                                />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {filteredTeams.length === 0 ? (
                      <div className="teamPicker__empty">
                        No saved teams match that search.
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="teamPicker__createBtn"
                      onClick={openTeamsWorkspace}
                    >
                      <Plus size={17} strokeWidth={2.7} aria-hidden="true" />
                      Add new team
                    </button>
                  </>
                ) : (
                  <>
                    <div className="teamPicker__empty">
                      No saved teams yet. Create your first roster from the
                      Teams tab.
                    </div>
                    <button
                      type="button"
                      className="teamPicker__createBtn"
                      onClick={openTeamsWorkspace}
                    >
                      <Plus size={17} strokeWidth={2.7} aria-hidden="true" />
                      Add new team
                    </button>
                  </>
                )}
              </div>
            )}
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
              icon={<Flag size={22} strokeWidth={2.3} />}
              title="Manual finish"
              description="End from the game menu."
              active={manualEndOnly}
              onClick={() => setManualEndOnly((value) => !value)}
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
            <ModeButton
              icon={<Dices size={22} strokeWidth={2.3} />}
              title="Dice"
              description={
                diceEnabled ? "Ready during the game." : "No dice roller."
              }
              active={diceEnabled}
              onClick={() => setDiceEnabled((value) => !value)}
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
                ? `Lowest wins mode requires at least 2 ${participantMode === "teams" ? "teams" : "players"}.`
                : `Win by 2 requires at least 2 ${participantMode === "teams" ? "teams" : "players"}.`}
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
      </div>
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

function TeamIconGlyph({
  icon,
  size = 18,
  strokeWidth = 2.5,
}: {
  icon?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon =
    TEAM_ICON_COMPONENTS[
      (icon ?? DEFAULT_TEAM_ICON) as keyof typeof TEAM_ICON_COMPONENTS
    ] ?? Dumbbell;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

function SelectionStateIcon({ selected }: { selected: boolean }) {
  return (
    <span
      className={`participantOption__state${
        selected ? " participantOption__state--selected" : ""
      }`}
      aria-hidden="true"
    >
      {selected ? (
        <Check size={15} strokeWidth={2.8} />
      ) : (
        <Plus size={15} strokeWidth={2.8} />
      )}
    </span>
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
