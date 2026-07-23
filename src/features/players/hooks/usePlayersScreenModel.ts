import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AVATAR_COLORS, DEFAULT_TEAM_ICON, TEAM_ICONS } from "../../../constants";
import type { Game, GameTeam, PlayerProfile, TeamMember } from "../../../types";
import { computeProfileStats, computeTeamStats } from "../../../utils/profileStats";
import { formatPlayerName, formatTeamName } from "../../../utils/text";
import { useScrollableListFade } from "../../../hooks/useScrollableListFade";

export type PlayersScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  canUseTeams: boolean;
  activeView: "players" | "teams";
  isAuthenticated: boolean;
  showLocalSessionsHint: boolean;
  pendingLocalSessionsCount: number;
  pendingLocalProfilesCount: number;
  onDismissLocalSessionsHint: () => void;
  onActiveViewChange: (view: "players" | "teams") => void;
  addingPlayer: boolean;
  openTeamBuilderToken?: number;
  onOpenTeamBuilderHandled?: () => void;
  onAddingPlayerChange: (adding: boolean) => void;
  onOpenAuth: () => void;
  onOpenProFeatureAuth: () => void;
  onOpenProPlan: () => void;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onUpdateProfile: (
    id: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
  onDeleteProfile: (id: string) => void;
  onCreateTeam: (name: string, icon?: string) => GameTeam | null;
  onTeamCreated?: (team: GameTeam) => void;
  onUpdateTeam: (
    id: string,
    updates: Partial<Pick<GameTeam, "name" | "icon">>,
  ) => void;
  onDeleteTeam: (id: string) => void;
  onToggleTeamMember: (teamId: string, profileId: string) => void;
};

function pickNextTeamIcon(teams: GameTeam[]) {
  const usedIcons = new Set(
    teams.map((team) => team.icon ?? DEFAULT_TEAM_ICON),
  );
  const availableIcons = TEAM_ICONS.filter((icon) => !usedIcons.has(icon.id));
  const iconPool = availableIcons.length > 0 ? availableIcons : TEAM_ICONS;
  return (
    iconPool[Math.floor(Math.random() * iconPool.length)]?.id ??
    DEFAULT_TEAM_ICON
  );
}

function prioritizeProfiles(
  profileList: PlayerProfile[],
  profileIds: string[],
) {
  if (!profileIds.length) return profileList;

  const priority = new Map(
    profileIds.map((profileId, index) => [profileId, index]),
  );
  return [...profileList].sort((left, right) => {
    const leftPriority = priority.get(left.id) ?? Number.POSITIVE_INFINITY;
    const rightPriority = priority.get(right.id) ?? Number.POSITIVE_INFINITY;
    return leftPriority - rightPriority;
  });
}

function buildTeamSummary(profiles: PlayerProfile[]) {
  if (!profiles.length) {
    return "This team is ready for recruitment. Add at least one player to complete the roster and unlock the final save step.";
  }
  if (profiles.length === 1) {
    return "Solo setup mode. Add more players to balance coverage before deployment.";
  }
  if (profiles.length < 4) {
    return "Solid core. Add one or two more players to give the team more lineup options.";
  }
  return "Well-rounded roster. Enough depth for rotation, tempo, and matchup flexibility.";
}

export function usePlayersScreenModel(props: PlayersScreenProps) {
  const {
    games,
    profiles,
    teams,
    teamMembers,
    canUseTeams,
    activeView,
    isAuthenticated,
    showLocalSessionsHint,
    pendingLocalSessionsCount,
    pendingLocalProfilesCount,
    onDismissLocalSessionsHint,
    onActiveViewChange,
    addingPlayer,
    openTeamBuilderToken,
    onOpenTeamBuilderHandled,
    onAddingPlayerChange,
    onOpenAuth,
    onOpenProFeatureAuth,
    onOpenProPlan,
    onUpsertProfile,
    onUpdateProfile,
    onDeleteProfile,
    onCreateTeam,
    onTeamCreated,
    onUpdateTeam,
    onDeleteTeam,
    onToggleTeamMember,
  } = props;
  const teamBuilderSlotRef = useRef<HTMLDivElement | null>(null);
  const handledOpenTeamBuilderTokenRef = useRef(0);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<
    (typeof AVATAR_COLORS)[number]["value"]
  >(AVATAR_COLORS[0].value);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState<string>(
    AVATAR_COLORS[0].value,
  );
  const [editingOriginalName, setEditingOriginalName] = useState("");
  const [editingOriginalColor, setEditingOriginalColor] = useState<string>(
    AVATAR_COLORS[0].value,
  );
  const [editingTeamOriginalIcon, setEditingTeamOriginalIcon] = useState<
    string | null
  >(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [editingTeamOriginalName, setEditingTeamOriginalName] = useState("");
  const [editingTeamMemberIds, setEditingTeamMemberIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [editingTeamOriginalMemberIds, setEditingTeamOriginalMemberIds] =
    useState<Set<string>>(() => new Set());
  const [editingTeamIconPickerOpen, setEditingTeamIconPickerOpen] =
    useState(false);
  const [expandedTeamAddPlayers, setExpandedTeamAddPlayers] = useState<
    Set<string>
  >(() => new Set());
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamIcon, setNewTeamIcon] = useState(DEFAULT_TEAM_ICON);
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamStep, setNewTeamStep] = useState<1 | 2>(1);
  const [newTeamMemberIds, setNewTeamMemberIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [newTeamSearch, setNewTeamSearch] = useState("");
  const [editingTeamSearch, setEditingTeamSearch] = useState("");
  const [creatingTeamPlayer, setCreatingTeamPlayer] = useState(false);
  const [creatingTeamPlayerForTeamId, setCreatingTeamPlayerForTeamId] =
    useState<string | null>(null);
  const [newTeamPlayerName, setNewTeamPlayerName] = useState("");
  const [newTeamPlayerColor, setNewTeamPlayerColor] = useState<
    (typeof AVATAR_COLORS)[number]["value"]
  >(AVATAR_COLORS[1]?.value ?? AVATAR_COLORS[0].value);
  const [recentTeamPlayerIds, setRecentTeamPlayerIds] = useState<string[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const profileStats = useMemo(() => computeProfileStats(games), [games]);
  const teamStats = useMemo(
    () => computeTeamStats(games, teams, teamMembers),
    [games, teamMembers, teams],
  );
  const teamMembersByTeamId = useMemo(() => {
    const map = new Map<string, TeamMember[]>();
    teamMembers.forEach((member) => {
      const next = map.get(member.teamId) ?? [];
      next.push(member);
      map.set(member.teamId, next);
    });
    return map;
  }, [teamMembers]);
  const activeCount = activeView === "teams" ? teams.length : profiles.length;
  const canAccessTeamsView = isAuthenticated && canUseTeams;
  const activeCountLabel =
    activeView === "teams"
      ? `${activeCount} team${activeCount === 1 ? "" : "s"}`
      : `${activeCount} player${activeCount === 1 ? "" : "s"}`;
  const newTeamSelectedProfiles = useMemo(
    () => profiles.filter((profile) => newTeamMemberIds.has(profile.id)),
    [newTeamMemberIds, profiles],
  );
  const filteredNewTeamProfiles = useMemo(() => {
    const query = newTeamSearch.trim().toLowerCase();
    const filteredProfiles = profiles.filter((profile) => {
      if (!query) return true;
      return profile.name.toLowerCase().includes(query);
    });
    return prioritizeProfiles(filteredProfiles, recentTeamPlayerIds);
  }, [newTeamSearch, profiles, recentTeamPlayerIds]);
  const newTeamSummary = useMemo(
    () => buildTeamSummary(newTeamSelectedProfiles),
    [newTeamSelectedProfiles],
  );
  const summaryTokenSize = useMemo(() => {
    const count = Math.max(newTeamSelectedProfiles.length, 1);
    if (count <= 3) return 58;
    if (count === 4) return 54;
    if (count === 5) return 50;
    if (count === 6) return 46;
    if (count === 7) return 40;
    if (count === 8) return 36;
    return 34;
  }, [newTeamSelectedProfiles.length]);
  const summaryTokenOverlap = useMemo(() => {
    if (summaryTokenSize >= 54) return 12;
    if (summaryTokenSize >= 46) return 10;
    if (summaryTokenSize >= 40) return 8;
    return 6;
  }, [summaryTokenSize]);
  const summaryStackStyle = useMemo(
    () =>
      ({
        "--summary-token-size": `${summaryTokenSize}px`,
        "--summary-token-overlap": `${summaryTokenOverlap}px`,
        "--summary-token-font-size": `${Math.max(
          14,
          Math.round(summaryTokenSize * 0.34),
        )}px`,
      }) as CSSProperties,
    [summaryTokenOverlap, summaryTokenSize],
  );
  const editingTeamProfiles = useMemo(() => {
    const query = editingTeamSearch.trim().toLowerCase();
    const filteredProfiles = profiles.filter((profile) => {
      if (!query) return true;
      return profile.name.toLowerCase().includes(query);
    });
    return prioritizeProfiles(filteredProfiles, recentTeamPlayerIds);
  }, [editingTeamSearch, profiles, recentTeamPlayerIds]);
  const editingTeamPlayerListFade = useScrollableListFade([
    editingTeamId,
    editingTeamSearch,
    editingTeamProfiles.length,
    profiles.length,
    editingTeamMemberIds.size,
    creatingTeamPlayer,
    expandedTeamAddPlayers.size,
  ]);

  useEffect(() => {
    if (!recentTeamPlayerIds.length) return;

    const frameId = window.requestAnimationFrame(() => {
      editingTeamPlayerListFade.ref.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [editingTeamPlayerListFade.ref, recentTeamPlayerIds]);

  function createProfile() {
    if (!newName.trim()) return;
    onUpsertProfile(newName.trim(), newColor);
    setNewName("");
    onAddingPlayerChange(false);
  }

  function finishRename(profileId: string) {
    const name = formatPlayerName(editingName);
    if (name) onUpdateProfile(profileId, { name, avatarColor: editingColor });
    setEditingId(null);
  }

  function startEditing(profile: PlayerProfile) {
    setEditingId(profile.id);
    setEditingName(profile.name);
    setEditingColor(profile.avatarColor);
    setEditingOriginalName(profile.name);
    setEditingOriginalColor(profile.avatarColor);
  }

  function undoEdit() {
    setEditingName(editingOriginalName);
    setEditingColor(editingOriginalColor);
  }

  function toggleTeamAddPlayers(teamId: string) {
    setExpandedTeamAddPlayers((current) => {
      const next = new Set(current);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  function closeTeamEditor() {
    setEditingTeamId(null);
    setEditingTeamOriginalIcon(null);
    setEditingTeamName("");
    setEditingTeamOriginalName("");
    setEditingTeamMemberIds(new Set());
    setEditingTeamOriginalMemberIds(new Set());
    setEditingTeamSearch("");
    setEditingTeamIconPickerOpen(false);
    setRecentTeamPlayerIds([]);
    cancelTeamPlayerCreation();
  }

  function cancelTeamPlayerCreation() {
    setCreatingTeamPlayer(false);
    setCreatingTeamPlayerForTeamId(null);
    setNewTeamPlayerName("");
  }

  function resetTeamBuilder() {
    setNewTeamStep(1);
    setNewTeamName("");
    setNewTeamIcon(pickNextTeamIcon(teams));
    setNewTeamMemberIds(new Set());
    setNewTeamSearch("");
    setNewTeamPlayerColor(AVATAR_COLORS[1]?.value ?? AVATAR_COLORS[0].value);
    setRecentTeamPlayerIds([]);
    cancelTeamPlayerCreation();
  }

  function closeTeamBuilder() {
    setAddingTeam(false);
    resetTeamBuilder();
  }

  function openTeamBuilder() {
    resetTeamBuilder();
    setAddingTeam(true);
  }

  function handleTeamsViewPress() {
    if (canAccessTeamsView) {
      onActiveViewChange("teams");
      onAddingPlayerChange(false);
      return;
    }

    if (!isAuthenticated) {
      onOpenProFeatureAuth();
      return;
    }

    onOpenProPlan();
  }

  function scrollTeamBuilderIntoView() {
    const slot = teamBuilderSlotRef.current;
    if (!slot) return;

    const scrollHost = slot.closest(".tabWindow") as HTMLElement | null;
    if (!scrollHost) {
      slot.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const hostRect = scrollHost.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const slotOffsetInHost = slotRect.top - hostRect.top;
    const targetTop = Math.max(0, scrollHost.scrollTop + slotOffsetInHost - 18);
    scrollHost.scrollTo({ top: targetTop, behavior: "smooth" });
  }

  useEffect(() => {
    if (
      !openTeamBuilderToken ||
      openTeamBuilderToken === handledOpenTeamBuilderTokenRef.current ||
      activeView !== "teams"
    )
      return;
    handledOpenTeamBuilderTokenRef.current = openTeamBuilderToken;
    openTeamBuilder();
    onOpenTeamBuilderHandled?.();
  }, [activeView, onOpenTeamBuilderHandled, openTeamBuilderToken]);

  useEffect(() => {
    if (activeView === "teams" && !canAccessTeamsView) {
      onActiveViewChange("players");
      setAddingTeam(false);
    }
  }, [activeView, canAccessTeamsView, onActiveViewChange]);

  useEffect(() => {
    if (activeView !== "teams" || !addingTeam) return;

    let timeoutId = 0;
    const rafId = window.requestAnimationFrame(() => {
      scrollTeamBuilderIntoView();
      timeoutId = window.setTimeout(scrollTeamBuilderIntoView, 140);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [activeView, addingTeam, newTeamStep]);

  function finishTeamEdit(teamId: string) {
    const name = formatTeamName(editingTeamName);
    if (!name || editingTeamMemberIds.size === 0) return;
    onUpdateTeam(teamId, { name });
    editingTeamMemberIds.forEach((profileId) => {
      if (!editingTeamOriginalMemberIds.has(profileId)) {
        onToggleTeamMember(teamId, profileId);
      }
    });
    editingTeamOriginalMemberIds.forEach((profileId) => {
      if (!editingTeamMemberIds.has(profileId)) {
        onToggleTeamMember(teamId, profileId);
      }
    });
    closeTeamEditor();
  }

  function createTeam() {
    if (!canUseTeams || !newTeamName.trim() || newTeamMemberIds.size === 0)
      return;
    const created = onCreateTeam(newTeamName.trim(), newTeamIcon);
    if (created) {
      newTeamMemberIds.forEach((profileId) =>
        onToggleTeamMember(created.id, profileId),
      );
      setEditingTeamId(null);
      setEditingTeamOriginalIcon(null);
      setEditingTeamName("");
      setEditingTeamOriginalName("");
      setNewTeamIcon(pickNextTeamIcon([...teams, created]));
      closeTeamBuilder();
      onTeamCreated?.(created);
    }
  }

  function toggleNewTeamMember(profileId: string) {
    if (!canUseTeams) return;
    setNewTeamMemberIds((current) => {
      const next = new Set(current);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function createTeamPlayer(teamId: string | null = null) {
    if (!canUseTeams || !newTeamPlayerName.trim()) return;
    const created = onUpsertProfile(
      newTeamPlayerName.trim(),
      newTeamPlayerColor,
    );
    if (created) {
      setRecentTeamPlayerIds((current) => [
        created.id,
        ...current.filter((profileId) => profileId !== created.id),
      ]);
      if (teamId && editingTeamId === teamId) {
        setEditingTeamSearch("");
        setEditingTeamMemberIds((current) => new Set(current).add(created.id));
      } else if (teamId) {
        setEditingTeamSearch("");
        onToggleTeamMember(teamId, created.id);
      } else {
        setNewTeamSearch("");
        setNewTeamMemberIds((current) => new Set(current).add(created.id));
      }
      setNewTeamPlayerName("");
      setNewTeamPlayerColor(AVATAR_COLORS[1]?.value ?? AVATAR_COLORS[0].value);
      setCreatingTeamPlayer(false);
      setCreatingTeamPlayerForTeamId(null);
    }
  }

  const hasEdits = Boolean(
    editingId &&
      (editingName !== editingOriginalName ||
        editingColor !== editingOriginalColor),
  );
  const titleActionLabel = activeView === "players" ? "New Player" : "New Team";

  return {
    activeCountLabel,
    activeView,
    addingPlayer,
    addingTeam,
    canAccessTeamsView,
    canUseTeams,
    cancelTeamPlayerCreation,
    closeTeamBuilder,
    closeTeamEditor,
    createProfile,
    createTeam,
    createTeamPlayer,
    creatingTeamPlayer,
    creatingTeamPlayerForTeamId,
    editingColor,
    editingId,
    editingName,
    editingTeamIconPickerOpen,
    editingTeamId,
    editingTeamMemberIds,
    editingTeamName,
    editingTeamOriginalIcon,
    editingTeamOriginalMemberIds,
    editingTeamOriginalName,
    editingTeamPlayerListFade,
    editingTeamProfiles,
    editingTeamSearch,
    expandedTeamAddPlayers,
    filteredNewTeamProfiles,
    finishRename,
    finishTeamEdit,
    handleTeamsViewPress,
    hasEdits,
    isAuthenticated,
    newColor,
    newName,
    newTeamIcon,
    newTeamMemberIds,
    newTeamName,
    newTeamPlayerColor,
    newTeamPlayerName,
    newTeamSearch,
    newTeamSelectedProfiles,
    newTeamStep,
    newTeamSummary,
    onActiveViewChange,
    onAddingPlayerChange,
    onDeleteProfile,
    onDeleteTeam,
    onDismissLocalSessionsHint,
    onOpenAuth,
    onUpdateTeam,
    openTeamBuilder,
    pendingLocalProfilesCount,
    pendingLocalSessionsCount,
    profileStats,
    profiles,
    recentTeamPlayerIds,
    setCreatingTeamPlayer,
    setCreatingTeamPlayerForTeamId,
    setEditingColor,
    setEditingId,
    setEditingName,
    setEditingTeamIconPickerOpen,
    setEditingTeamId,
    setEditingTeamMemberIds,
    setEditingTeamName,
    setEditingTeamOriginalIcon,
    setEditingTeamOriginalMemberIds,
    setEditingTeamOriginalName,
    setEditingTeamSearch,
    setExpandedTeamAddPlayers,
    setNewColor,
    setNewName,
    setNewTeamIcon,
    setNewTeamName,
    setNewTeamPlayerColor,
    setNewTeamPlayerName,
    setNewTeamSearch,
    setNewTeamStep,
    showLocalSessionsHint,
    startEditing,
    summaryStackStyle,
    teamBuilderSlotRef,
    teamMembersByTeamId,
    teamStats,
    teams,
    titleActionLabel,
    toggleNewTeamMember,
    toggleTeamAddPlayers,
    undoEdit,
  };
}
