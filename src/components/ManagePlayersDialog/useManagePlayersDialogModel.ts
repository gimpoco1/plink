import {
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from "react";
import { AVATAR_COLORS } from "../../constants";
import type { GameTeam, Player, PlayerProfile, TeamMember } from "../../types";
import { clampName } from "../../utils/text";

export type ManagePlayersDialogHandle = {
  open: () => void;
  openWithCreate: () => void;
  close: () => void;
};

export type StagedCustomPlayer = {
  name: string;
  avatarColor: string;
  saveForLater: boolean;
};

export type ManagePlayersDialogProps = {
  participantMode: "players" | "teams";
  profiles: PlayerProfile[];
  savedTeams: GameTeam[];
  savedTeamMembers: TeamMember[];
  currentPlayers: Player[];
  currentTeams: GameTeam[];
  canUseTeams: boolean;
  takenProfileIds: Set<string>;
  isAuthenticated: boolean;
  onDeleteProfile: (profileId: string) => void;
  onDeletePlayer: (playerId: string) => Promise<void> | void;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onUpsertLocalPlayer: (
    name: string,
    avatarColor: string,
  ) => PlayerProfile | null;
  onUpdateProfile: (
    profileId: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
  onUpdatePlayer: (
    playerId: string,
    updates: Partial<
      Pick<Player, "name" | "avatarColor" | "profileId" | "teamId">
    >,
  ) => void;
  onCreateTeam: (
    name: string,
    icon?: string,
    members?: PlayerProfile[],
  ) => GameTeam | null;
  onDeleteTeam: (teamId: string, teamName: string) => Promise<void> | void;
  onDeleteSavedTeam: (teamId: string, teamName: string) => Promise<void> | void;
  onStartGame: (profileIds: string[], newPlayers: StagedCustomPlayer[]) => void;
  onOpenTeamsTab: () => void;
};

export function useManagePlayersDialogModel(
  props: ManagePlayersDialogProps,
  ref: ForwardedRef<ManagePlayersDialogHandle>,
) {
  const {
    participantMode,
    profiles,
    savedTeams,
    savedTeamMembers,
    currentPlayers,
    currentTeams,
    canUseTeams,
    takenProfileIds,
    isAuthenticated,
    onDeleteProfile,
    onDeletePlayer,
    onUpsertProfile,
    onUpsertLocalPlayer,
    onUpdateProfile,
    onUpdatePlayer,
    onCreateTeam,
    onDeleteTeam,
    onDeleteSavedTeam,
    onStartGame,
    onOpenTeamsTab,
  } = props;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [selectedColor, setSelectedColor] = useState<
    (typeof AVATAR_COLORS)[number]["value"]
  >(AVATAR_COLORS[0]?.value ?? "#64748b");
  const [search, setSearch] = useState("");
  const [saveForLater, setSaveForLater] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showRosterImmediately, setShowRosterImmediately] = useState(false);
  const [stagedProfileIds, setStagedProfileIds] = useState<Set<string>>(
    new Set(),
  );
  const [stagedTeamIds, setStagedTeamIds] = useState<Set<string>>(new Set());
  const [stagedCustomPlayers, setStagedCustomPlayers] = useState<
    StagedCustomPlayer[]
  >([]);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState<
    (typeof AVATAR_COLORS)[number]["value"]
  >(AVATAR_COLORS[0]?.value ?? "#64748b");

  const currentGamePlayers = useMemo(() => {
    return currentPlayers.filter((player) => player.name.trim().length > 0);
  }, [currentPlayers]);
  const isTeamsGame = participantMode === "teams";
  const isPlayersGame = participantMode !== "teams";

  const currentProfileIds = useMemo(() => {
    return new Set(
      currentGamePlayers
        .map((player) => player.profileId)
        .filter((profileId): profileId is string => Boolean(profileId)),
    );
  }, [currentGamePlayers]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visibleProfiles = profiles.filter(
      (p) => !currentProfileIds.has(p.id),
    );
    if (!q) return visibleProfiles;
    return visibleProfiles.filter((p) => p.name.toLowerCase().includes(q));
  }, [profiles, currentProfileIds, search]);

  const currentPlayerNameValidationMessage = useMemo(() => {
    const normalizedName = clampName(editingName).trim().toLowerCase();
    if (!normalizedName || editingPlayerId === null) return undefined;

    const conflictingNames = new Set<string>(
      currentGamePlayers
        .filter((player) => player.id !== editingPlayerId)
        .map((player) => player.name.trim().toLowerCase()),
    );

    return conflictingNames.has(normalizedName)
      ? "A player with this name is already in the game."
      : undefined;
  }, [currentGamePlayers, editingName, editingPlayerId]);

  const savedProfileNameValidationMessage = useMemo(() => {
    const normalizedName = clampName(editingName).trim().toLowerCase();
    if (!normalizedName || editingProfileId === null) return undefined;

    const conflictingNames = new Set<string>(
      profiles
        .filter((profile) => profile.id !== editingProfileId)
        .map((profile) => profile.name.trim().toLowerCase()),
    );

    return conflictingNames.has(normalizedName)
      ? "A saved player with this name already exists."
      : undefined;
  }, [editingName, editingProfileId, profiles]);

  const newPlayerValidationMessage = useMemo(() => {
    const normalizedName = clampName(pendingName).trim().toLowerCase();
    if (!normalizedName) return undefined;

    const conflictingNames = new Set<string>([
      ...profiles
        .filter(
          (profile) =>
            takenProfileIds.has(profile.id) || stagedProfileIds.has(profile.id),
        )
        .map((profile) => profile.name.trim().toLowerCase()),
      ...currentGamePlayers.map((player) => player.name.trim().toLowerCase()),
      ...stagedCustomPlayers.map((player) => player.name.trim().toLowerCase()),
    ]);

    return conflictingNames.has(normalizedName)
      ? "A player with this name is already in the game."
      : undefined;
  }, [
    currentGamePlayers,
    pendingName,
    profiles,
    stagedCustomPlayers,
    stagedProfileIds,
    takenProfileIds,
  ]);

  const stagedCount = stagedProfileIds.size + stagedCustomPlayers.length;
  const stagedProfiles = useMemo(
    () => profiles.filter((profile) => stagedProfileIds.has(profile.id)),
    [profiles, stagedProfileIds],
  );
  const stagedTeams = useMemo(
    () => savedTeams.filter((team) => stagedTeamIds.has(team.id)),
    [savedTeams, stagedTeamIds],
  );
  const stagedTeamCount = stagedTeamIds.size;
  const teamMembersByTeamId = useMemo(() => {
    const grouped = new Map<string, Player[]>();
    currentTeams.forEach((team) => grouped.set(team.id, []));
    currentPlayers.forEach((player) => {
      if (!player.teamId || !grouped.has(player.teamId)) return;
      grouped.get(player.teamId)?.push(player);
    });
    grouped.forEach((players, teamId) => {
      grouped.set(
        teamId,
        [...players].sort((a, b) => {
          if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
          return a.name.localeCompare(b.name);
        }),
      );
    });
    return grouped;
  }, [currentPlayers, currentTeams]);
  const profilesById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const savedTeamProfilesByTeamId = useMemo(() => {
    const grouped = new Map<string, PlayerProfile[]>();
    savedTeams.forEach((team) => grouped.set(team.id, []));
    savedTeamMembers.forEach((member) => {
      const profile = profilesById.get(member.profileId);
      if (!profile || !grouped.has(member.teamId)) return;
      grouped.get(member.teamId)?.push(profile);
    });
    grouped.forEach((members, teamId) => {
      grouped.set(
        teamId,
        [...members].sort((a, b) => {
          if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
          return a.name.localeCompare(b.name);
        }),
      );
    });
    return grouped;
  }, [profilesById, savedTeamMembers, savedTeams]);
  const availableSavedTeams = useMemo(() => {
    const currentTeamNames = new Set(
      currentTeams.map((team) => team.name.trim().toLowerCase()),
    );
    const query = search.trim().toLowerCase();
    return savedTeams
      .filter((team) => {
        const name = team.name.trim();
        if (!name) return false;
        if (currentTeamNames.has(name.toLowerCase())) return false;
        if (!query) return true;
        return name.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        const bTime = b.updatedAt ?? b.createdAt;
        const aTime = a.updatedAt ?? a.createdAt;
        if (bTime !== aTime) return bTime - aTime;
        return a.name.localeCompare(b.name);
      });
  }, [currentTeams, savedTeams, search]);
  const submitLabel =
    stagedCount === 0
      ? "Add to game"
      : `Add ${stagedCount} player${stagedCount === 1 ? "" : "s"} to game`;
  const teamSubmitLabel =
    stagedTeamCount === 0
      ? "Add teams to game"
      : `Add ${stagedTeamCount} team${stagedTeamCount === 1 ? "" : "s"} to game`;

  function addSavedTeamToCurrentGame(team: GameTeam) {
    const members = savedTeamProfilesByTeamId.get(team.id) ?? [];
    onCreateTeam(team.name, team.icon, members);
  }

  function resetState() {
    setPendingName("");
    setSelectedColor(AVATAR_COLORS[0]?.value ?? "#64748b");
    setSearch("");
    setSaveForLater(isAuthenticated);
    setIsCreating(false);
    setShowRosterImmediately(false);
    setEditingPlayerId(null);
    setEditingName("");
    setEditingColor(AVATAR_COLORS[0]?.value ?? "#64748b");
    setStagedProfileIds(new Set());
    setStagedTeamIds(new Set());
    setStagedCustomPlayers([]);
  }

  function open() {
    resetState();
    dialogRef.current?.showModal();
  }

  function openWithCreate() {
    resetState();
    setIsCreating(true);
    setShowRosterImmediately(true);
    dialogRef.current?.showModal();
    queueMicrotask(() => nameInputRef.current?.focus());
  }

  function close() {
    dialogRef.current?.close();
  }

  useImperativeHandle(ref, () => ({ open, openWithCreate, close }), [
    isAuthenticated,
  ]);

  function toggleProfile(profileId: string) {
    setStagedProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  }

  function toggleTeam(teamId: string) {
    setStagedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  function submitTeams() {
    if (stagedTeamIds.size === 0) return;
    stagedTeams.forEach(addSavedTeamToCurrentGame);
    close();
  }

  function submit() {
    const name = clampName(pendingName);
    if (!name || newPlayerValidationMessage) return;
    if (saveForLater && isAuthenticated) {
      const profile = onUpsertProfile(name, selectedColor);
      if (profile) {
        setStagedProfileIds((prev) => new Set(prev).add(profile.id));
        setPendingName("");
        setSelectedColor(AVATAR_COLORS[0]?.value ?? "#64748b");
        setSaveForLater(isAuthenticated);
        setIsCreating(false);
        return;
      }
    }
    if (!isAuthenticated) {
      const localProfile = onUpsertLocalPlayer(name, selectedColor);
      if (localProfile) {
        setStagedProfileIds((prev) => new Set(prev).add(localProfile.id));
        setPendingName("");
        setSelectedColor(AVATAR_COLORS[0]?.value ?? "#64748b");
        setSaveForLater(isAuthenticated);
        setIsCreating(false);
        return;
      }
    }
    setStagedCustomPlayers((prev) => [
      ...prev,
      { name, avatarColor: selectedColor, saveForLater },
    ]);
    setPendingName("");
    setSelectedColor(AVATAR_COLORS[0]?.value ?? "#64748b");
    setSaveForLater(isAuthenticated);
    setIsCreating(false);
  }

  return {
    availableSavedTeams,
    canUseTeams,
    close,
    currentGamePlayers,
    currentPlayerNameValidationMessage,
    currentTeams,
    dialogRef,
    editingColor,
    editingName,
    editingPlayerId,
    editingProfileId,
    filteredProfiles,
    isAuthenticated,
    isCreating,
    isPlayersGame,
    isTeamsGame,
    nameInputRef,
    newPlayerValidationMessage,
    onDeletePlayer,
    onDeleteProfile,
    onDeleteSavedTeam,
    onDeleteTeam,
    onOpenTeamsTab,
    onStartGame,
    onUpdatePlayer,
    onUpdateProfile,
    pendingName,
    profiles,
    resetState,
    saveForLater,
    savedProfileNameValidationMessage,
    savedTeamProfilesByTeamId,
    savedTeams,
    search,
    selectedColor,
    setEditingColor,
    setEditingName,
    setEditingPlayerId,
    setEditingProfileId,
    setIsCreating,
    setPendingName,
    setSaveForLater,
    setSearch,
    setSelectedColor,
    setStagedCustomPlayers,
    showRosterImmediately,
    stagedCount,
    stagedCustomPlayers,
    stagedProfileIds,
    stagedProfiles,
    stagedTeamCount,
    stagedTeamIds,
    stagedTeams,
    submit,
    submitLabel,
    submitTeams,
    takenProfileIds,
    teamMembersByTeamId,
    teamSubmitLabel,
    toggleProfile,
    toggleTeam,
  };
}
