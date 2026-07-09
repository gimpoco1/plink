import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AVATAR_COLORS, DEFAULT_TEAM_ICON, TEAM_ICONS } from "../constants";
import type { Game, GameTeam, PlayerProfile, TeamMember } from "../types";
import { LockedFrame } from "../components/HomeLockedState/LockedFrame";
import { PlayersSkeleton } from "../components/HomeLockedState/PlayersSkeleton";
import { AdBannerSlot } from "../components/AdBannerSlot/AdBannerSlot";
import { LocalSessionsHint } from "../components/LocalSessionsHint/LocalSessionsHint";
import { avatarStyleFor } from "../utils/color";
import {
  computeProfileStats,
  computeTeamStats,
  type SessionResultSummary,
} from "../utils/profileStats";
import {
  formatAccountPlayerName,
  formatPlayerName,
  formatTeamName,
  getInitials,
} from "../utils/text";
import { SwipeableCard } from "../components/SwipeableCard/SwipeableCard";
import { NewPlayerComposer } from "../components/NewPlayerComposer/NewPlayerComposer";
import "./PlayersScreen.css";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Flag,
  Flame,
  Pencil,
  Plus,
  Search,
  Shield,
  Star,
  Target,
  Trash2,
  Trophy,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import { SearchableRosterPicker } from "../components/SearchableRosterPicker/SearchableRosterPicker";

type PlayersScreenProps = {
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

function areSetsEqual<T>(left: Set<T>, right: Set<T>) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
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

export function PlayersScreen({
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
}: PlayersScreenProps) {
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
  }, [activeView, openTeamBuilderToken]);

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
    if (!name) return;
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
  const newPlayerForm = (
    <div className="createCard profileCard profileCard--new">
      <div className="createCard__top">
        <span
          className="profileAvatar createCard__avatar"
          style={avatarStyleFor(newColor)}
        >
          {newName.trim() ? getInitials(newName) : "+"}
        </span>
        <input
          autoFocus
          className="editInput createCard__input"
          placeholder="Player Name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") createProfile();
            if (event.key === "Escape") onAddingPlayerChange(false);
          }}
        />
      </div>
      <div className="createCard__picker">
        <ColorPicker
          value={newColor}
          onChange={setNewColor}
          label="new player"
        />
      </div>
      <div className="createCard__actions">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => onAddingPlayerChange(false)}
        >
          Cancel
        </button>
        <button
          className="btn btn--primary btn--sm"
          disabled={!newName.trim()}
          onClick={createProfile}
        >
          Create
        </button>
      </div>
    </div>
  );
  const newTeamForm = (
    <div className="teamBuilder">
      <div className="teamBuilder__header">
        <button
          type="button"
          className="teamBuilder__close"
          aria-label="Close team builder"
          onClick={closeTeamBuilder}
        >
          <X size={22} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <div className="teamBuilder__headerCopy">
          <div className="teamBuilder__eyebrow">Build Team</div>
          <h3 className="teamBuilder__title">
            {newTeamStep === 1 ? "Team Identity" : "Recruit Players"}
          </h3>
        </div>
        <div className="teamBuilder__step">Step {newTeamStep} of 2</div>
      </div>

      <div className="teamBuilder__progress" aria-hidden="true">
        <span
          className={`teamBuilder__progressSegment${
            newTeamStep === 1
              ? " teamBuilder__progressSegment--current"
              : " teamBuilder__progressSegment--complete"
          }`}
        />
        <span
          className={`teamBuilder__progressSegment${
            newTeamStep === 2 ? " teamBuilder__progressSegment--current" : ""
          }`}
        />
      </div>

      {newTeamStep === 1 ? (
        <>
          <div className="teamBuilder__intro">
            <p className="teamBuilder__lede">
              Set your team&apos;s visual identity for saved rosters and
              team-based matchmaking.
            </p>
          </div>

          <section className="teamBuilderCard teamBuilderCard--identity">
            <div className="teamBuilderIdentity teamBuilderIdentity--compact">
              <div className="teamBuilderIdentity__preview" aria-hidden="true">
                <div className="teamBuilderIdentity__badge teamBuilderIdentity__badge--compact">
                  <TeamIcon icon={newTeamIcon} size={22} strokeWidth={2.2} />
                </div>
              </div>
              <div className="teamBuilderIdentity__field">
                <label
                  className="teamBuilder__sectionEyebrow"
                  htmlFor="team-builder-name"
                >
                  Team name
                </label>
                <div className="teamBuilderIdentity__nameRow">
                  <input
                    id="team-builder-name"
                    autoFocus
                    className="teamBuilder__input teamBuilder__input--hero"
                    placeholder={
                      canUseTeams
                        ? "Los Bandidos"
                        : "Team creation is available on Pro"
                    }
                    value={newTeamName}
                    disabled={!canUseTeams}
                    onChange={(event) => setNewTeamName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && newTeamName.trim()) {
                        setNewTeamStep(2);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="teamBuilderCard__group">
              <div className="teamBuilderCard__label">Choose your insignia</div>
              <TeamIconPicker
                value={newTeamIcon}
                onChange={setNewTeamIcon}
                label="new team"
                layout="grid"
                density="compact"
              />
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="teamBuilder__intro">
            <p className="teamBuilder__lede">
              Assemble your team from saved profiles or create new recruits on
              the fly.
            </p>
          </div>

          <section className="teamBuilderCard">
            <div className="teamBuilderCard__head">
              <div className="teamBuilderCard__label">Choose players</div>
              <div className="teamBuilderCard__badge">
                {newTeamSelectedProfiles.length} member
                {newTeamSelectedProfiles.length === 1 ? "" : "s"}
              </div>
            </div>
            <SearchableRosterPicker
              key={`new-team-roster-${recentTeamPlayerIds.join(":") || "default"}`}
              variant="dark"
              className="teamBuilderRosterPicker"
              listMaxHeight="184px"
              searchValue={newTeamSearch}
              onSearchChange={setNewTeamSearch}
              searchPlaceholder="Search players..."
              searchAriaLabel="Search saved players"
              clearAriaLabel="Clear player search"
              emptyState={
                profiles.length > 0
                  ? "No matching saved players."
                  : "No saved players yet."
              }
              createButtonLabel={
                creatingTeamPlayer && creatingTeamPlayerForTeamId === null
                  ? undefined
                  : "Add new player"
              }
              onCreateButtonClick={
                creatingTeamPlayer && creatingTeamPlayerForTeamId === null
                  ? undefined
                  : () => {
                      setCreatingTeamPlayer(true);
                      setCreatingTeamPlayerForTeamId(null);
                    }
              }
            >
              {filteredNewTeamProfiles.map((profile) => {
                const selected = newTeamMemberIds.has(profile.id);
                return (
                  <button
                    key={`builder-player-${profile.id}`}
                    type="button"
                    className={`teamBuilderPlayerOption${
                      selected ? " teamBuilderPlayerOption--selected" : ""
                    }`}
                    disabled={!canUseTeams}
                    onClick={() => toggleNewTeamMember(profile.id)}
                    aria-pressed={selected}
                  >
                    <span className="teamBuilderPlayerOption__identity">
                      <span
                        className="teamBuilderPlayerOption__avatar"
                        style={avatarStyleFor(profile.avatarColor)}
                        aria-hidden="true"
                      >
                        {getInitials(profile.name)}
                      </span>
                      <span className="teamBuilderPlayerOption__copy">
                        <strong>
                          {profile.isAccountPlayer
                            ? formatAccountPlayerName(profile.name)
                            : profile.name}
                        </strong>
                      </span>
                    </span>
                    <span
                      className={`teamBuilderPlayerOption__state${
                        selected
                          ? " teamBuilderPlayerOption__state--selected"
                          : ""
                      }`}
                      aria-hidden="true"
                    >
                      {selected ? (
                        <Check size={17} strokeWidth={2.8} />
                      ) : (
                        <Plus size={17} strokeWidth={2.8} />
                      )}
                    </span>
                  </button>
                );
              })}
            </SearchableRosterPicker>
            <NewPlayerComposer
              className="teamBuilderCreatePlayer teamBuilderCreatePlayer--inline teamBuilderCreatePlayer--composer"
              isOpen={
                creatingTeamPlayer && creatingTeamPlayerForTeamId === null
              }
              showTrigger={false}
              isAuthenticated={isAuthenticated}
              disabled={!canUseTeams}
              inputId="team-builder-player-name"
              name={newTeamPlayerName}
              color={newTeamPlayerColor}
              saveAsProfile
              showPersistenceControls={false}
              onOpen={() => {
                setCreatingTeamPlayer(true);
                setCreatingTeamPlayerForTeamId(null);
              }}
              onOpenAuth={onOpenAuth}
              onCancel={cancelTeamPlayerCreation}
              onAdd={() => createTeamPlayer()}
              onNameChange={setNewTeamPlayerName}
              onColorChange={setNewTeamPlayerColor}
              onSaveAsProfileChange={() => {}}
            />
          </section>

          <section className="teamBuilderCard teamBuilderCard--summary">
            <div className="teamBuilderSummary">
              <div className="teamBuilderSummary__copy">
                <h4>Tactical Summary</h4>
                <p>{newTeamSummary}</p>
              </div>
              <div
                className="teamBuilderSummary__stack"
                style={summaryStackStyle}
                aria-hidden="true"
              >
                {newTeamSelectedProfiles.map((profile, index) => (
                  <span
                    key={`builder-summary-${profile.id}`}
                    className="teamBuilderSummary__token"
                    style={{
                      ...avatarStyleFor(profile.avatarColor),
                      zIndex: newTeamSelectedProfiles.length - index,
                    }}
                  >
                    {getInitials(profile.name)}
                  </span>
                ))}
                {newTeamSelectedProfiles.length === 0 ? (
                  <span className="teamBuilderSummary__token teamBuilderSummary__token--ghost">
                    +
                  </span>
                ) : null}
              </div>
            </div>
          </section>
        </>
      )}

      <div
        className={`teamBuilder__footer${
          newTeamStep === 1 ? " teamBuilder__footer--single" : ""
        }`}
      >
        {newTeamStep === 2 ? (
          <button
            type="button"
            className="btn btn--ghost teamBuilder__footerButton"
            onClick={() => {
              setNewTeamStep(1);
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
            Back
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--primary teamBuilder__footerButton teamBuilder__footerButton--primary"
          disabled={
            newTeamStep === 1
              ? !canUseTeams || !newTeamName.trim()
              : !canUseTeams ||
                !newTeamName.trim() ||
                newTeamMemberIds.size === 0
          }
          onClick={() => {
            if (newTeamStep === 1) {
              setNewTeamStep(2);
              return;
            }
            createTeam();
          }}
        >
          {newTeamStep === 1 ? "Continue" : "Create team"}
          <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`tabContent tabContent--players${
        activeView === "teams" ? " tabContent--teamsTheme" : ""
      }`}
    >
      {showLocalSessionsHint ? (
        <LocalSessionsHint
          className="profilesHint"
          sessionCount={pendingLocalSessionsCount}
          profileCount={pendingLocalProfilesCount}
          onDismiss={onDismissLocalSessionsHint}
          onAdd={onOpenAuth}
        />
      ) : null}
      <AdBannerSlot
        placement="Players"
        slotId={import.meta.env.VITE_ADSENSE_PLAYERS_SLOT_ID}
      />
      <div className="tabHeader playersScreenHeader">
        <div className="playersScreenHeader__content">
          {isAuthenticated ? (
            <div className="playersScreenHeader__titleRow">
              <div className="playersScreenHeader__titleGroup">
                <h2 className="tabTitle">
                  {activeView === "teams" ? "Teams" : "Players"}
                </h2>
                <span className="playersScreenCount">{activeCountLabel}</span>
              </div>
              <button
                type="button"
                className="playersScreenHeader__action"
                disabled={
                  !isAuthenticated || (activeView === "teams" && !canUseTeams)
                }
                aria-expanded={
                  activeView === "players" ? addingPlayer : addingTeam
                }
                onClick={() => {
                  if (activeView === "players") {
                    onAddingPlayerChange(true);
                    return;
                  }
                  if (!addingTeam) openTeamBuilder();
                }}
              >
                <Plus size={18} strokeWidth={2.8} aria-hidden="true" />
                {titleActionLabel}
              </button>
            </div>
          ) : (
            <div className="playersScreenHeader__titleRow">
              <div className="playersScreenHeader__titleGroup">
                <h2 className="tabTitle">Players</h2>
              </div>
            </div>
          )}
          <p className="tabSubtitle">
            {!isAuthenticated || activeView === "players"
              ? "Reuse profiles and track cumulative results across sessions."
              : "Build reusable groups for team-based games."}
          </p>
          {isAuthenticated ? (
            <div
              className="playersHeaderSwitch"
              role="tablist"
              aria-label="Players view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "players"}
                className={`playersHeaderSwitch__option${
                  activeView === "players"
                    ? " playersHeaderSwitch__option--active"
                    : ""
                }`}
                onClick={() => {
                  onActiveViewChange("players");
                  closeTeamBuilder();
                }}
              >
                Individuals
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "teams"}
                aria-disabled={!canAccessTeamsView}
                className={`playersHeaderSwitch__option${
                  activeView === "teams"
                    ? " playersHeaderSwitch__option--active"
                    : ""
                }${
                  !canAccessTeamsView
                    ? " playersHeaderSwitch__option--locked"
                    : ""
                }`}
                onClick={handleTeamsViewPress}
              >
                Teams
                {!canAccessTeamsView ? (
                  <span className="playersHeaderSwitch__badge">Pro</span>
                ) : null}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {!isAuthenticated ? (
        <LockedFrame title="Sign in to save players." onSignIn={onOpenAuth}>
          <PlayersSkeleton />
        </LockedFrame>
      ) : (
        <>
          {activeView === "players" && addingPlayer ? (
            <div className="playersCreateSlot">{newPlayerForm}</div>
          ) : null}
          {activeView === "teams" && addingTeam ? (
            <div ref={teamBuilderSlotRef} className="playersCreateSlot">
              {newTeamForm}
            </div>
          ) : null}
          {activeView === "players" ? (
            <div className="profilesGrid">
              {!profiles.length && !addingPlayer ? (
                <div className="emptyMsg">No saved players yet.</div>
              ) : (
                profiles.map((profile) => {
                  const stats = profileStats.get(profile.id);
                  const isEditing = editingId === profile.id;
                  return (
                    <SwipeableCard
                      key={profile.id}
                      actionWidth={120}
                      disabled={isEditing || profile.isAccountPlayer}
                      cardClassName={`profileCard${isEditing ? " profileCard--editing" : ""}`}
                      renderActions={({ closeSwipe }) => (
                        <button
                          className="swipeDelete"
                          type="button"
                          onClick={() => {
                            closeSwipe();
                            onDeleteProfile(profile.id);
                          }}
                          aria-label={`Delete player ${profile.name}`}
                        >
                          <Trash2
                            size={20}
                            strokeWidth={2.2}
                            aria-hidden="true"
                          />
                          Delete
                        </button>
                      )}
                    >
                      {() => (
                        <>
                          <div className="profileCard__topRow">
                            <div className="profileCard__main">
                              <span
                                className="profileAvatar"
                                style={avatarStyleFor(
                                  isEditing
                                    ? editingColor
                                    : profile.avatarColor,
                                )}
                              >
                                {getInitials(
                                  isEditing
                                    ? editingName || profile.name
                                    : profile.name,
                                )}
                              </span>
                              <div className="profileCard__info">
                                <div className="profileCard__header">
                                  <div className="profileCard__titleBlock">
                                    {isEditing ? (
                                      <div className="profileCard__nameEdit">
                                        <input
                                          autoFocus
                                          className="editInput"
                                          value={editingName}
                                          onChange={(event) =>
                                            setEditingName(event.target.value)
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter")
                                              finishRename(profile.id);
                                            if (event.key === "Escape")
                                              setEditingId(null);
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="profileCard__nameText">
                                        {profile.isAccountPlayer
                                          ? formatAccountPlayerName(
                                              profile.name,
                                            )
                                          : profile.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {isEditing ? (
                              <div className="profileCard__actions">
                                {hasEdits ? (
                                  <button
                                    className="profileUndoBtn"
                                    type="button"
                                    aria-label={`Undo changes for ${profile.name}`}
                                    onClick={() => undoEdit()}
                                  >
                                    <Undo2
                                      size={18}
                                      strokeWidth={2.2}
                                      aria-hidden="true"
                                    />
                                  </button>
                                ) : null}
                                <button
                                  className={`profileEditBtn profileEditBtn--active`}
                                  type="button"
                                  aria-label={`Finish editing ${profile.name}`}
                                  onClick={() => finishRename(profile.id)}
                                >
                                  <Check
                                    size={18}
                                    strokeWidth={2.3}
                                    aria-hidden="true"
                                  />
                                </button>
                              </div>
                            ) : (
                              <button
                                className={`profileEditBtn`}
                                type="button"
                                aria-label={`Edit ${profile.name}`}
                                onClick={() => startEditing(profile)}
                              >
                                <Pencil
                                  size={18}
                                  strokeWidth={2.3}
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="profileCard__paletteRow">
                              <ColorPicker
                                value={editingColor}
                                onChange={setEditingColor}
                                label={profile.name}
                              />
                            </div>
                          ) : null}

                          {stats?.sessionResults.length ? (
                            <GamesDropdown
                              title="Sessions"
                              sessionResults={stats.sessionResults}
                            />
                          ) : null}
                        </>
                      )}
                    </SwipeableCard>
                  );
                })
              )}
            </div>
          ) : (
            <section className="teamsSection" aria-label="Saved teams">
              {!teams.length ? (
                <div className="emptyMsg">
                  {canUseTeams
                    ? "No teams yet."
                    : "Upgrade to Pro to create saved teams."}
                </div>
              ) : (
                <div className="teamsList" role="list" aria-label="Teams">
                  {teams.map((team) => {
                    const persistedTeamMemberProfiles = (
                      teamMembersByTeamId.get(team.id) ?? []
                    )
                      .map((member) =>
                        profiles.find(
                          (profile) => profile.id === member.profileId,
                        ),
                      )
                      .filter(Boolean) as PlayerProfile[];
                    const persistedTeamMemberIds = new Set(
                      persistedTeamMemberProfiles.map((profile) => profile.id),
                    );
                    const isEditingTeam = editingTeamId === team.id;
                    const isAddingPlayers = expandedTeamAddPlayers.has(team.id);
                    const teamIcon = team.icon ?? DEFAULT_TEAM_ICON;
                    const teamGameStats = teamStats.get(team.id);
                    const activeTeamMemberIds = isEditingTeam
                      ? editingTeamMemberIds
                      : persistedTeamMemberIds;
                    const teamMemberProfiles = profiles.filter((profile) =>
                      activeTeamMemberIds.has(profile.id),
                    );
                    const normalizedEditingTeamName =
                      formatTeamName(editingTeamName);
                    const hasTeamEdits =
                      isEditingTeam &&
                      ((editingTeamOriginalIcon !== null &&
                        teamIcon !== editingTeamOriginalIcon) ||
                        (editingTeamOriginalName &&
                          normalizedEditingTeamName !==
                            editingTeamOriginalName) ||
                        !areSetsEqual(
                          editingTeamMemberIds,
                          editingTeamOriginalMemberIds,
                        ));

                    return (
                      <SwipeableCard
                        key={team.id}
                        actionWidth={120}
                        disabled={isEditingTeam}
                        cardClassName={`teamCard${
                          isEditingTeam ? " teamCard--editing" : ""
                        }`}
                        renderActions={({ closeSwipe }) => (
                          <button
                            className="swipeDelete"
                            type="button"
                            onClick={() => {
                              closeSwipe();
                              onDeleteTeam(team.id);
                              if (editingTeamId === team.id) {
                                closeTeamEditor();
                              }
                            }}
                            aria-label={`Delete team ${team.name}`}
                          >
                            <Trash2
                              size={20}
                              strokeWidth={2.2}
                              aria-hidden="true"
                            />
                            Delete
                          </button>
                        )}
                      >
                        {() => (
                          <>
                            {isEditingTeam ? (
                              <>
                                <div className="teamCard__builderHeader">
                                  <div className="teamBuilderIdentity teamBuilderIdentity--compact">
                                    <div
                                      className="teamBuilderIdentity__preview"
                                      aria-hidden="true"
                                    >
                                      <div className="teamBuilderIdentity__badge teamBuilderIdentity__badge--compact">
                                        <TeamIcon
                                          icon={team.icon}
                                          size={22}
                                          strokeWidth={2.3}
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        className={`teamBuilderIdentity__iconEdit${
                                          editingTeamIconPickerOpen
                                            ? " teamBuilderIdentity__iconEdit--active"
                                            : ""
                                        }`}
                                        aria-label={
                                          editingTeamIconPickerOpen
                                            ? `Hide insignia options for ${team.name}`
                                            : `Edit insignia for ${team.name}`
                                        }
                                        onClick={() =>
                                          setEditingTeamIconPickerOpen(
                                            (current) => !current,
                                          )
                                        }
                                      >
                                        <Pencil
                                          size={16}
                                          strokeWidth={2.4}
                                          aria-hidden="true"
                                        />
                                      </button>
                                    </div>
                                    <div className="teamBuilderIdentity__field">
                                      <label
                                        className="teamBuilder__sectionEyebrow"
                                        htmlFor={`team-edit-name-${team.id}`}
                                      >
                                        Team name
                                      </label>
                                      <div className="teamBuilderIdentity__nameRow">
                                        <input
                                          id={`team-edit-name-${team.id}`}
                                          autoFocus
                                          className="teamBuilder__input teamBuilder__input--hero teamBuilder__input--compactHero"
                                          value={editingTeamName}
                                          onChange={(event) =>
                                            setEditingTeamName(
                                              event.target.value,
                                            )
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              finishTeamEdit(team.id);
                                            }
                                            if (event.key === "Escape") {
                                              closeTeamEditor();
                                            }
                                          }}
                                          aria-label={`Team name for ${team.name}`}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {editingTeamIconPickerOpen ? (
                                  <section className="teamCard__builderSection">
                                    <div className="teamBuilderCard__group">
                                      <div className="teamBuilderCard__label">
                                        Choose your insignia
                                      </div>
                                      <TeamIconPicker
                                        value={team.icon ?? DEFAULT_TEAM_ICON}
                                        onChange={(icon) =>
                                          onUpdateTeam(team.id, { icon })
                                        }
                                        label={team.name}
                                        layout="grid"
                                      />
                                    </div>
                                  </section>
                                ) : null}

                                <section className="teamBuilderCard teamCard__builderSection teamCard__builderSection--flat">
                                  <div className="teamBuilderCard__head">
                                    <div className="teamBuilderCard__label">
                                      Manage team members
                                    </div>
                                    <div className="teamBuilderCard__badge">
                                      {teamMemberProfiles.length} member
                                      {teamMemberProfiles.length === 1
                                        ? ""
                                        : "s"}
                                    </div>
                                  </div>

                                  {teamMemberProfiles.length === 0 ? (
                                    <div className="teamBuilder__emptyState">
                                      No players in this team yet.
                                    </div>
                                  ) : null}

                                  <div className="teamBuilderRosterPreview teamBuilderRosterPreview--compact">
                                    {teamMemberProfiles.map((member) => {
                                      const canRemoveMember =
                                        teamMemberProfiles.length > 1;
                                      return (
                                        <button
                                          key={`${team.id}-${member.id}`}
                                          type="button"
                                          className={`teamBuilderRosterChip${" teamBuilderRosterChip--compact"}${
                                            canRemoveMember
                                              ? " teamBuilderRosterChip--removable"
                                              : ""
                                          }`}
                                          disabled={
                                            !canUseTeams || !canRemoveMember
                                          }
                                          onClick={() => {
                                            if (canRemoveMember) {
                                              setEditingTeamMemberIds(
                                                (current) => {
                                                  const next = new Set(
                                                    current,
                                                  );
                                                  next.delete(member.id);
                                                  return next;
                                                },
                                              );
                                            }
                                          }}
                                        >
                                          <span
                                            className="teamBuilderRosterChip__avatar"
                                            style={avatarStyleFor(
                                              member.avatarColor,
                                            )}
                                            aria-hidden="true"
                                          >
                                            {getInitials(member.name)}
                                          </span>
                                          <span className="teamBuilderRosterChip__name">
                                            {member.isAccountPlayer
                                              ? formatAccountPlayerName(
                                                  member.name,
                                                )
                                              : member.name}
                                          </span>
                                          {canRemoveMember ? (
                                            <span className="teamBuilderRosterChip__action">
                                              ×
                                            </span>
                                          ) : null}
                                        </button>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      className={`teamBuilderRosterChip teamBuilderRosterChip--compact teamBuilderRosterChip--add${
                                        isAddingPlayers
                                          ? " teamBuilderRosterChip--addActive"
                                          : ""
                                      }`}
                                      disabled={!canUseTeams}
                                      onClick={() =>
                                        toggleTeamAddPlayers(team.id)
                                      }
                                      aria-expanded={isAddingPlayers}
                                      aria-label={
                                        isAddingPlayers
                                          ? "Hide player picker"
                                          : "Add players"
                                      }
                                    >
                                      <span
                                        className={`teamBuilderRosterChip__addIcon${
                                          isAddingPlayers
                                            ? " teamBuilderRosterChip__addIcon--active"
                                            : ""
                                        }`}
                                        aria-hidden="true"
                                      >
                                        <Plus
                                          size={18}
                                          strokeWidth={2.6}
                                          aria-hidden="true"
                                        />
                                      </span>
                                    </button>
                                  </div>

                                  {isAddingPlayers ? (
                                    <div className="teamEditor__addPanel teamEditor__addPanel--builder">
                                      <div className="teamBuilderCard__head">
                                        <div className="teamBuilderCard__label">
                                          Choose players
                                        </div>
                                        <div className="teamBuilderCard__badge">
                                          {editingTeamMemberIds.size} member
                                          {editingTeamMemberIds.size === 1
                                            ? ""
                                            : "s"}
                                        </div>
                                      </div>
                                      <label className="teamBuilderSearch">
                                        <Search
                                          size={18}
                                          strokeWidth={2.4}
                                          aria-hidden="true"
                                        />
                                        <input
                                          className="teamBuilderSearch__input"
                                          placeholder="Search players..."
                                          value={editingTeamSearch}
                                          onChange={(event) =>
                                            setEditingTeamSearch(
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </label>
                                      {profiles.length > 0 ? (
                                        <div
                                          className={`participantPicker__listShell teamBuilderListShell${
                                            editingTeamPlayerListFade.fadeState
                                              .top
                                              ? " participantPicker__listShell--fadeTop teamBuilderListShell--fadeTop"
                                              : ""
                                          }${
                                            editingTeamPlayerListFade.fadeState
                                              .bottom
                                              ? " participantPicker__listShell--fadeBottom teamBuilderListShell--fadeBottom"
                                              : ""
                                          }`}
                                        >
                                          <div
                                            ref={editingTeamPlayerListFade.ref}
                                            className="participantPicker__list teamBuilderPlayerList"
                                          >
                                            <div className="participantPicker__listContent">
                                              {editingTeamProfiles.length >
                                              0 ? (
                                                editingTeamProfiles.map(
                                                  (profile) => {
                                                    const selected =
                                                      editingTeamMemberIds.has(
                                                        profile.id,
                                                      );
                                                    return (
                                                      <button
                                                        key={`${team.id}:${profile.id}`}
                                                        type="button"
                                                        className={`teamBuilderPlayerOption${
                                                          selected
                                                            ? " teamBuilderPlayerOption--selected"
                                                            : ""
                                                        }`}
                                                        disabled={!canUseTeams}
                                                        onClick={() =>
                                                          setEditingTeamMemberIds(
                                                            (current) => {
                                                              const next =
                                                                new Set(
                                                                  current,
                                                                );
                                                              if (
                                                                next.has(
                                                                  profile.id,
                                                                )
                                                              ) {
                                                                next.delete(
                                                                  profile.id,
                                                                );
                                                              } else {
                                                                next.add(
                                                                  profile.id,
                                                                );
                                                              }
                                                              return next;
                                                            },
                                                          )
                                                        }
                                                        aria-pressed={selected}
                                                      >
                                                        <span className="teamBuilderPlayerOption__identity">
                                                          <span
                                                            className="teamBuilderPlayerOption__avatar"
                                                            style={avatarStyleFor(
                                                              profile.avatarColor,
                                                            )}
                                                            aria-hidden="true"
                                                          >
                                                            {getInitials(
                                                              profile.name,
                                                            )}
                                                          </span>
                                                          <span className="teamBuilderPlayerOption__copy">
                                                            <strong>
                                                              {profile.isAccountPlayer
                                                                ? formatAccountPlayerName(
                                                                    profile.name,
                                                                  )
                                                                : profile.name}
                                                            </strong>
                                                          </span>
                                                        </span>
                                                        <span
                                                          className={`teamBuilderPlayerOption__state${
                                                            selected
                                                              ? " teamBuilderPlayerOption__state--selected"
                                                              : ""
                                                          }`}
                                                          aria-hidden="true"
                                                        >
                                                          {selected ? (
                                                            <Check
                                                              size={17}
                                                              strokeWidth={2.8}
                                                            />
                                                          ) : (
                                                            <Plus
                                                              size={17}
                                                              strokeWidth={2.8}
                                                            />
                                                          )}
                                                        </span>
                                                      </button>
                                                    );
                                                  },
                                                )
                                              ) : (
                                                <div className="teamBuilder__emptyState">
                                                  No matching saved players.
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="teamBuilder__emptyState">
                                          No saved players yet.
                                        </div>
                                      )}

                                      <div className="teamBuilderCreatePlayer">
                                        {creatingTeamPlayer &&
                                        creatingTeamPlayerForTeamId ===
                                          team.id ? (
                                          <NewPlayerComposer
                                            className="teamBuilderCreatePlayer teamBuilderCreatePlayer--composer"
                                            isOpen
                                            showTrigger={false}
                                            isAuthenticated={
                                              isAuthenticated
                                            }
                                            disabled={!canUseTeams}
                                            inputId={`team-edit-player-${team.id}`}
                                            name={newTeamPlayerName}
                                            color={newTeamPlayerColor}
                                            saveAsProfile
                                            showPersistenceControls={false}
                                            onOpen={() => {
                                              setCreatingTeamPlayer(true);
                                              setCreatingTeamPlayerForTeamId(
                                                team.id,
                                              );
                                            }}
                                            onOpenAuth={onOpenAuth}
                                            onCancel={
                                              cancelTeamPlayerCreation
                                            }
                                            onAdd={() =>
                                              createTeamPlayer(team.id)
                                            }
                                            onNameChange={
                                              setNewTeamPlayerName
                                            }
                                            onColorChange={
                                              setNewTeamPlayerColor
                                            }
                                            onSaveAsProfileChange={() => {}}
                                          />
                                        ) : (
                                          <button
                                            type="button"
                                            className="rosterPicker__createBtn rosterPicker__createBtn--dark teamBuilderCreatePlayer__trigger"
                                            disabled={!canUseTeams}
                                            onClick={() => {
                                              setCreatingTeamPlayer(true);
                                              setCreatingTeamPlayerForTeamId(
                                                team.id,
                                              );
                                            }}
                                          >
                                            <Plus
                                              size={17}
                                              strokeWidth={2.7}
                                              aria-hidden="true"
                                            />
                                            <span>Add new player</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </section>

                                <div className="teamCard__footerActions">
                                  {hasTeamEdits ? (
                                    <>
                                      <button
                                        className="btn btn--ghost teamCard__footerBtn"
                                        type="button"
                                        aria-label={`Undo changes for ${team.name}`}
                                        onClick={() => {
                                          if (editingTeamOriginalIcon) {
                                            onUpdateTeam(team.id, {
                                              icon: editingTeamOriginalIcon,
                                            });
                                          }
                                          setEditingTeamName(
                                            editingTeamOriginalName,
                                          );
                                          setEditingTeamMemberIds(
                                            new Set(
                                              editingTeamOriginalMemberIds,
                                            ),
                                          );
                                        }}
                                      >
                                        <Undo2
                                          size={18}
                                          strokeWidth={2.2}
                                          aria-hidden="true"
                                        />
                                        Undo
                                      </button>
                                      <button
                                        className="btn btn--primary teamCard__footerBtn teamCard__footerBtn--primary"
                                        type="button"
                                        aria-label={`Save changes for ${team.name}`}
                                        onClick={() => finishTeamEdit(team.id)}
                                      >
                                        <Check
                                          size={18}
                                          strokeWidth={2.3}
                                          aria-hidden="true"
                                        />
                                        Save changes
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="btn btn--ghost teamCard__footerBtn"
                                      type="button"
                                      aria-label={`Cancel editing ${team.name}`}
                                      onClick={() => closeTeamEditor()}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="teamCard__head">
                                  <div className="teamCard__identity">
                                    <div
                                      className="teamCard__icon"
                                      aria-hidden="true"
                                    >
                                      <TeamIcon icon={team.icon} size={24} />
                                    </div>
                                    <div>
                                      <div className="teamCard__title">
                                        {team.name}
                                      </div>
                                      <div className="teamCard__meta">
                                        {teamMemberProfiles.length} player
                                        {teamMemberProfiles.length === 1
                                          ? ""
                                          : "s"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="teamCard__actions">
                                    <button
                                      className="profileEditBtn"
                                      type="button"
                                      aria-label={`Edit ${team.name}`}
                                      onClick={() => {
                                        setEditingTeamId(team.id);
                                        setEditingTeamOriginalIcon(teamIcon);
                                        setEditingTeamName(team.name);
                                        setEditingTeamOriginalName(team.name);
                                        setEditingTeamMemberIds(
                                          new Set(persistedTeamMemberIds),
                                        );
                                        setEditingTeamOriginalMemberIds(
                                          new Set(persistedTeamMemberIds),
                                        );
                                        setEditingTeamSearch("");
                                        setEditingTeamIconPickerOpen(false);
                                        setCreatingTeamPlayer(false);
                                        setCreatingTeamPlayerForTeamId(null);
                                        setNewTeamPlayerName("");
                                        setExpandedTeamAddPlayers((current) => {
                                          const next = new Set(current);
                                          next.delete(team.id);
                                          return next;
                                        });
                                      }}
                                    >
                                      <Pencil
                                        size={18}
                                        strokeWidth={2.3}
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </div>
                                </div>

                                <div className="teamCard__members">
                                  {teamMemberProfiles.length > 0 ? (
                                    teamMemberProfiles.map((member) => (
                                      <button
                                        key={`${team.id}-${member.id}`}
                                        type="button"
                                        className="teamMemberChip"
                                        disabled
                                      >
                                        <span
                                          className="teamMemberChip__avatar"
                                          style={avatarStyleFor(
                                            member.avatarColor,
                                          )}
                                          aria-hidden="true"
                                        >
                                          {getInitials(member.name)}
                                        </span>
                                        <span>
                                          {member.isAccountPlayer
                                            ? formatAccountPlayerName(
                                                member.name,
                                              )
                                            : member.name}
                                        </span>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="teamCard__empty">
                                      No players in this team yet.
                                    </div>
                                  )}
                                </div>

                                {teamGameStats?.sessionResults.length ? (
                                  <GamesDropdown
                                    title="Sessions"
                                    sessionResults={
                                      teamGameStats.sessionResults
                                    }
                                  />
                                ) : null}
                              </>
                            )}
                          </>
                        )}
                      </SwipeableCard>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function GamesDropdown({
  title,
  sessionResults,
}: {
  title: string;
  sessionResults: SessionResultSummary[];
}) {
  function getStatusLabel(statusKind: SessionResultSummary["statusKind"]) {
    if (statusKind === "won") return "Won";
    if (statusKind === "lost") return "Lost";
    if (statusKind === "draw") return "Draw";
    if (statusKind === "in_progress") return "In Progress";
    return "Completed";
  }

  return (
    <details className="profileGamesDropdown">
      <summary className="profileGamesDropdown__summary">
        <div className="profileGamesDropdown__summaryLeft">
          <span className="profileGamesDropdown__title">{title}</span>
        </div>
        <span className="profileGamesDropdown__count">
          {sessionResults.length}
        </span>
      </summary>
      <div className="profileCard__gameResults">
        {sessionResults.map((result) => (
          <div key={result.id} className="profileCard__gameResult">
            <span className="profileCard__gameResultMain">
              <span className="profileCard__gameResultName">{result.name}</span>
              {result.isTeamGame ? (
                <span className="profileCard__gameResultBadge">Teams</span>
              ) : null}
            </span>
            <span className="profileCard__gameResultStatus">
              {result.teamName ? (
                <span className="profileCard__gameResultTeamContext">
                  {result.teamIcon ? (
                    <span
                      className="profileCard__gameResultTeamIcon"
                      aria-hidden="true"
                    >
                      <TeamIcon
                        icon={result.teamIcon}
                        size={14}
                        strokeWidth={2.3}
                      />
                    </span>
                  ) : null}
                  <span className="profileCard__gameResultTeamName">
                    {result.teamName}
                  </span>
                </span>
              ) : null}
              <strong
                className={`profileCard__statusBadge profileCard__statusBadge--${result.statusKind}`}
              >
                {getStatusLabel(result.statusKind)}
              </strong>
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function TeamIcon({
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

function TeamIconPicker({
  value,
  onChange,
  label,
  layout = "strip",
  density = "default",
}: {
  value: string;
  onChange: (icon: string) => void;
  label: string;
  layout?: "strip" | "grid";
  density?: "default" | "compact";
}) {
  return (
    <div
      className={`teamIconPicker${
        layout === "grid" ? " teamIconPicker--grid" : ""
      }${
        layout === "grid" && density === "compact"
          ? " teamIconPicker--compactGrid"
          : ""
      }`}
      aria-label={`Icon for ${label}`}
    >
      {TEAM_ICONS.map((icon) => (
        <button
          key={icon.id}
          type="button"
          className={`teamIconPicker__option${
            layout === "grid" ? " teamIconPicker__option--grid" : ""
          }${
            layout === "grid" && density === "compact"
              ? " teamIconPicker__option--compactGrid"
              : ""
          }${value === icon.id ? " teamIconPicker__option--active" : ""}`}
          aria-label={`Use ${icon.label} icon for ${label}`}
          aria-pressed={value === icon.id}
          onClick={() => onChange(icon.id)}
        >
          <TeamIcon icon={icon.id} />
        </button>
      ))}
    </div>
  );
}

function buildTeamSummary(profiles: PlayerProfile[]) {
  if (!profiles.length) {
    return "This team is ready for recruitment. Add at least one player to complete the roster and unlock the final save step.";
  }
  if (profiles.length === 1) {
    return `Solo setup mode. Add more players to balance coverage before deployment.`;
  }
  if (profiles.length < 4) {
    return `Solid core. Add one or two more players to give the team more lineup options.`;
  }
  return `Well-rounded roster. Enough depth for rotation, tempo, and matchup flexibility.`;
}

function ColorPicker({
  value,
  onChange,
  label,
  compact = false,
  disabled = false,
}: {
  value: string;
  onChange: (color: (typeof AVATAR_COLORS)[number]["value"]) => void;
  label: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={`profileCard__colors${compact ? " profileCard__colors--compact" : ""}`}
    >
      {AVATAR_COLORS.map((color) => (
        <button
          key={color.id}
          className={`colorDot ${value === color.value ? "active" : ""}`}
          style={{ backgroundColor: color.value }}
          onClick={() => {
            if (!disabled) onChange(color.value);
          }}
          aria-label={`Use ${color.id} color for ${label}`}
          aria-pressed={value === color.value}
          aria-disabled={disabled}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
