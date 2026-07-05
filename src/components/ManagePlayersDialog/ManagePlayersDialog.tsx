import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AVATAR_COLORS } from "../../constants";
import type { GameTeam, Player, PlayerProfile, TeamMember } from "../../types";
import { avatarStyleFor } from "../../utils/color";
import {
  capitalizeFirst,
  clampName,
  formatAccountPlayerName,
  getInitials,
} from "../../utils/text";
import { DEFAULT_TEAM_ICON } from "../../constants";
import {
  ArrowUpRight,
  Dumbbell,
  Flag,
  Flame,
  Shield,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import "./ManagePlayersDialog.css";

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

export type ManagePlayersDialogHandle = {
  open: () => void;
  close: () => void;
};

type StagedCustomPlayer = {
  name: string;
  avatarColor: string;
  saveForLater: boolean;
};

type Props = {
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
  onStartGame: (profileIds: string[], newPlayers: StagedCustomPlayer[]) => void;
  onOpenTeamsTab: () => void;
};

export const ManagePlayersDialog = forwardRef<ManagePlayersDialogHandle, Props>(
  function ManagePlayersDialog(
    {
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
      onUpdatePlayer,
      onCreateTeam,
      onDeleteTeam,
      onStartGame,
      onOpenTeamsTab,
    },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const [pendingName, setPendingName] = useState("");
    const [selectedColor, setSelectedColor] = useState<string>(
      AVATAR_COLORS[0]?.value ?? "#64748b",
    );
    const [search, setSearch] = useState("");
    const [saveForLater, setSaveForLater] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [stagedProfileIds, setStagedProfileIds] = useState<Set<string>>(
      new Set(),
    );
    const [stagedCustomPlayers, setStagedCustomPlayers] = useState<
      StagedCustomPlayer[]
    >([]);
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [editingColor, setEditingColor] = useState<string>(
      AVATAR_COLORS[0]?.value ?? "#64748b",
    );

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
      if (!isAuthenticated) return [];
      const q = search.trim().toLowerCase();
      const visibleProfiles = profiles.filter(
        (p) => !currentProfileIds.has(p.id),
      );
      if (!q) return visibleProfiles;
      return visibleProfiles.filter((p) => p.name.toLowerCase().includes(q));
    }, [profiles, currentProfileIds, isAuthenticated, search]);

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

    const newPlayerValidationMessage = useMemo(() => {
      const normalizedName = clampName(pendingName).trim().toLowerCase();
      if (!normalizedName) return undefined;

      const conflictingNames = new Set<string>([
        ...profiles
          .filter(
            (profile) =>
              takenProfileIds.has(profile.id) ||
              stagedProfileIds.has(profile.id),
          )
          .map((profile) => profile.name.trim().toLowerCase()),
        ...currentGamePlayers.map((player) => player.name.trim().toLowerCase()),
        ...stagedCustomPlayers.map((player) =>
          player.name.trim().toLowerCase(),
        ),
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
      return savedTeams.filter((team) => {
        const name = team.name.trim();
        if (!name) return false;
        if (currentTeamNames.has(name.toLowerCase())) return false;
        if (!query) return true;
        return name.toLowerCase().includes(query);
      });
    }, [currentTeams, savedTeams, search]);
    const submitLabel =
      stagedCount === 0
        ? "Add to game"
        : `Add ${stagedCount} player${stagedCount === 1 ? "" : "s"} to game`;

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
      setEditingPlayerId(null);
      setEditingName("");
      setEditingColor(AVATAR_COLORS[0]?.value ?? "#64748b");
      setStagedProfileIds(new Set());
      setStagedCustomPlayers([]);
    }

    function open() {
      resetState();
      dialogRef.current?.showModal();
    }

    function close() {
      dialogRef.current?.close();
    }

    useImperativeHandle(ref, () => ({ open, close }), [isAuthenticated]);

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
      setStagedCustomPlayers((prev) => [
        ...prev,
        { name, avatarColor: selectedColor, saveForLater },
      ]);
      setPendingName("");
      setSelectedColor(AVATAR_COLORS[0]?.value ?? "#64748b");
      setSaveForLater(isAuthenticated);
      setIsCreating(false);
    }

    return (
      <dialog
        className="dialog managePlayersDialog"
        ref={dialogRef}
        onClose={resetState}
      >
        <div className="dialog__form managePlayersDialog__form">
          <div className="dialog__head managePlayersDialog__head">
            <div>
              <div className="managePlayersDialog__eyebrow">Game roster</div>
              <div className="dialog__title">
                {isCreating
                  ? "Add new player"
                  : isTeamsGame
                    ? "Manage teams"
                    : "Manage players"}
              </div>
            </div>
            <button
              className="iconbtn"
              type="button"
              onClick={close}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {!isCreating ? (
            <div className="dialog__body managePlayersDialog__body">
              {isPlayersGame ? (
                <div className="managePlayersDialog__summary">
                  <div className="managePlayersDialog__summaryStats">
                    <div className="managePlayersDialog__summaryStat">
                      <span>Playing</span>
                      <strong>{currentGamePlayers.length}</strong>
                    </div>
                    <div className="managePlayersDialog__summaryStat">
                      <span>To be added</span>
                      <strong>{stagedCount}</strong>
                    </div>
                  </div>
                  <span>
                    {isAuthenticated
                      ? "Build your lineup: pick saved players or create a new challenger."
                      : "Create temporary players for this game."}
                  </span>
                </div>
              ) : null}

              {isTeamsGame ? null : (
                <div className="managePlayersDialog__toolbar">
                  <button
                    className="btn btn--ghost managePlayersDialog__createBtn"
                    type="button"
                    onClick={() => {
                      setIsCreating(true);
                      queueMicrotask(() => nameInputRef.current?.focus());
                    }}
                  >
                    + Add new player
                  </button>
                </div>
              )}

              {isPlayersGame && stagedCount > 0 ? (
                <section className="managePlayersDialog__queue">
                  <div className="managePlayersDialog__simpleTitle">
                    Ready to add
                  </div>
                  <div className="managePlayersDialog__queueList">
                    {stagedProfiles.map((profile) => {
                      const displayName = profile.isAccountPlayer
                        ? formatAccountPlayerName(profile.name)
                        : capitalizeFirst(profile.name);
                      return (
                        <button
                          key={`queued-profile-${profile.id}`}
                          className="managePlayersDialog__queueChip"
                          type="button"
                          onClick={() => toggleProfile(profile.id)}
                          aria-label={`Remove ${displayName}`}
                        >
                          <span
                            className="managePlayersDialog__queueAvatar"
                            style={avatarStyleFor(profile.avatarColor)}
                            aria-hidden="true"
                          >
                            {getInitials(profile.name)}
                          </span>
                          <span>{displayName}</span>
                          <span className="managePlayersDialog__queueRemove">
                            ×
                          </span>
                        </button>
                      );
                    })}
                    {stagedCustomPlayers.map((player, idx) => (
                      <button
                        key={`queued-custom-${idx}`}
                        className="managePlayersDialog__queueChip"
                        type="button"
                        onClick={() =>
                          setStagedCustomPlayers((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        aria-label={`Remove ${capitalizeFirst(player.name)}`}
                      >
                        <span
                          className="managePlayersDialog__queueAvatar"
                          style={avatarStyleFor(player.avatarColor)}
                          aria-hidden="true"
                        >
                          {getInitials(player.name)}
                        </span>
                        <span>{capitalizeFirst(player.name)}</span>
                        <span className="managePlayersDialog__queueRemove">
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="managePlayersDialog__sections">
                {isTeamsGame ? (
                  <section className="managePlayersDialog__section">
                    <div className="managePlayersDialog__sectionHeaderRow managePlayersDialog__sectionHeaderRow--teams">
                      <div className="managePlayersDialog__simpleTitle">
                        Teams in this game
                      </div>
                    </div>

                    {currentTeams.length > 0 ? (
                      <div className="managePlayersDialog__teamList">
                        {currentTeams.map((team) => {
                          const members =
                            teamMembersByTeamId.get(team.id) ?? [];
                          const overflowCount = Math.max(0, members.length - 5);
                          const TeamIcon =
                            TEAM_ICON_COMPONENTS[
                              (team.icon ??
                                DEFAULT_TEAM_ICON) as keyof typeof TEAM_ICON_COMPONENTS
                            ] ?? Dumbbell;
                          return (
                            <article
                              className="managePlayersDialog__teamCard"
                              key={team.id}
                            >
                              <div className="managePlayersDialog__teamCardMain">
                                <div className="managePlayersDialog__teamIdentity">
                                  <div className="managePlayersDialog__teamHeading">
                                    <span
                                      className="managePlayersDialog__teamIcon"
                                      aria-hidden="true"
                                    >
                                      <TeamIcon size={15} strokeWidth={2.2} />
                                    </span>
                                    <span className="managePlayersDialog__teamName">
                                      {team.name}
                                    </span>
                                    <div
                                      className="managePlayersDialog__teamMembers"
                                      aria-label={`${team.name} members`}
                                    >
                                      {members.slice(0, 5).map((member) => (
                                        <span
                                          key={`${team.id}:${member.id}`}
                                          className="managePlayersDialog__teamMemberAvatar"
                                          style={avatarStyleFor(
                                            member.avatarColor,
                                          )}
                                          title={member.name}
                                          aria-label={member.name}
                                        >
                                          {getInitials(member.name)}
                                        </span>
                                      ))}
                                      {overflowCount > 0 ? (
                                        <span
                                          className="managePlayersDialog__teamMemberOverflow"
                                          aria-label={`${overflowCount} more players`}
                                        >
                                          +{overflowCount}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  className="managePlayersDialog__inlineAction managePlayersDialog__inlineAction--danger"
                                  type="button"
                                  onClick={() =>
                                    void onDeleteTeam(team.id, team.name)
                                  }
                                  aria-label={`Remove ${team.name}`}
                                  title="Remove"
                                >
                                  <span aria-hidden="true">×</span>
                                  <span>Remove</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="managePlayersDialog__empty">
                        No teams in this game yet.
                      </div>
                    )}

                    <div className="managePlayersDialog__sectionHeaderRow">
                      <div className="managePlayersDialog__simpleTitle">
                        Saved teams
                      </div>
                      <label className="managePlayersDialog__searchInline">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="managePlayersDialog__searchIcon"
                        >
                          <circle
                            cx="11"
                            cy="11"
                            r="6"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="m20 20-4.2-4.2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <input
                          className="input input--compact managePlayersDialog__searchInput"
                          placeholder="Search saved teams"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          aria-label="Search saved teams"
                        />
                      </label>
                    </div>

                    {availableSavedTeams.length > 0 ? (
                      <div className="managePlayersDialog__list managePlayersDialog__list--saved">
                        {availableSavedTeams.map((team) => {
                          const members =
                            savedTeamProfilesByTeamId.get(team.id) ?? [];
                          const overflowCount = Math.max(0, members.length - 5);
                          const TeamIcon =
                            TEAM_ICON_COMPONENTS[
                              (team.icon ??
                                DEFAULT_TEAM_ICON) as keyof typeof TEAM_ICON_COMPONENTS
                            ] ?? Dumbbell;

                          return (
                            <article
                              className="managePlayersDialog__teamCard"
                              key={`saved-team-${team.id}`}
                            >
                              <div className="managePlayersDialog__teamCardMain">
                                <div className="managePlayersDialog__teamIdentity">
                                  <div className="managePlayersDialog__teamHeading">
                                    <span
                                      className="managePlayersDialog__teamIcon"
                                      aria-hidden="true"
                                    >
                                      <TeamIcon size={15} strokeWidth={2.2} />
                                    </span>
                                    <span className="managePlayersDialog__teamName">
                                      {team.name}
                                    </span>
                                    {members.length > 0 ? (
                                      <div
                                        className="managePlayersDialog__teamMembers"
                                        aria-label={`${team.name} saved members`}
                                      >
                                        {members.slice(0, 5).map((member) => (
                                          <span
                                            key={`${team.id}:saved:${member.id}`}
                                            className="managePlayersDialog__teamMemberAvatar"
                                            style={avatarStyleFor(
                                              member.avatarColor,
                                            )}
                                            title={member.name}
                                            aria-label={member.name}
                                          >
                                            {getInitials(member.name)}
                                          </span>
                                        ))}
                                        {overflowCount > 0 ? (
                                          <span
                                            className="managePlayersDialog__teamMemberOverflow"
                                            aria-label={`${overflowCount} more saved players`}
                                          >
                                            +{overflowCount}
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                  {members.length === 0 ? (
                                    <span className="managePlayersDialog__meta">
                                      Saved team
                                    </span>
                                  ) : null}
                                </div>
                                <button
                                  className="managePlayersDialog__inlineAction managePlayersDialog__inlineAction--add"
                                  type="button"
                                  onClick={() =>
                                    addSavedTeamToCurrentGame(team)
                                  }
                                  aria-label={`Add ${team.name}`}
                                  title="Add"
                                  disabled={!canUseTeams}
                                >
                                  <span aria-hidden="true">+</span>
                                  <span>Add</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="managePlayersDialog__empty">
                        {search
                          ? "No saved teams match that search."
                          : savedTeams.length > 0
                            ? "All saved teams are already in this game."
                            : "No saved teams yet. Create one from the Teams tab."}
                      </div>
                    )}

                    <div className="managePlayersDialog__modeNotice">
                      <div className="managePlayersDialog__modeNoticeLead">
                        <div
                          className="managePlayersDialog__modeNoticeIcon"
                          aria-hidden="true"
                        >
                          <Users size={18} strokeWidth={2.3} />
                        </div>
                        <div className="managePlayersDialog__modeNoticeCopy">
                          <span className="managePlayersDialog__modeNoticeTag">
                            Teams only
                          </span>
                          <strong>
                            Create or edit teams from the Teams tab.
                          </strong>
                          <span>
                            Team games only accept saved teams. Individual
                            players need to be grouped into a team first.
                          </span>
                        </div>
                      </div>
                      <button
                        className="btn managePlayersDialog__modeCta"
                        type="button"
                        onClick={() => {
                          close();
                          onOpenTeamsTab();
                        }}
                      >
                        <span>Open Teams tab</span>
                        <ArrowUpRight size={15} strokeWidth={2.3} aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                ) : null}

                {isPlayersGame && currentGamePlayers.length > 0 ? (
                  <section className="managePlayersDialog__section">
                    <div className="managePlayersDialog__simpleTitle">
                      Players in this game
                    </div>

                    <div className="managePlayersDialog__list">
                      {currentGamePlayers.map((player) => {
                        const linkedProfile = player.profileId
                          ? profiles.find(
                              (profile) => profile.id === player.profileId,
                            )
                          : undefined;
                        const displayName = linkedProfile?.isAccountPlayer
                          ? formatAccountPlayerName(player.name)
                          : capitalizeFirst(player.name);
                        const isEditing = editingPlayerId === player.id;

                        return (
                          <article
                            className={`managePlayersDialog__card${
                              isEditing
                                ? " managePlayersDialog__card--editing"
                                : ""
                            }`}
                            key={`current-${player.id}`}
                          >
                            <div className="managePlayersDialog__cardMain">
                              <span
                                className="managePlayersDialog__avatar"
                                style={avatarStyleFor(
                                  isEditing ? editingColor : player.avatarColor,
                                )}
                                aria-hidden="true"
                              >
                                {getInitials(player.name)}
                              </span>

                              {isEditing ? (
                                <div className="managePlayersDialog__editStack">
                                  <div className="managePlayersDialog__editTop">
                                    <input
                                      className="input input--compact managePlayersDialog__editInput"
                                      value={editingName}
                                      onChange={(e) =>
                                        setEditingName(e.target.value)
                                      }
                                      autoFocus
                                      maxLength={28}
                                      placeholder="Player name"
                                      aria-invalid={
                                        !!currentPlayerNameValidationMessage
                                      }
                                    />
                                    <div className="managePlayersDialog__actionsRow managePlayersDialog__actionsRow--edit">
                                      <button
                                        className="iconbtn iconbtn--sm iconbtn--primary managePlayersDialog__actionBtn"
                                        type="button"
                                        onClick={() => {
                                          const trimmedName =
                                            clampName(editingName);
                                          if (
                                            !trimmedName ||
                                            currentPlayerNameValidationMessage
                                          ) {
                                            return;
                                          }
                                          onUpdatePlayer(player.id, {
                                            name: trimmedName,
                                            avatarColor: editingColor,
                                          });
                                          setEditingPlayerId(null);
                                          setEditingName("");
                                        }}
                                        disabled={
                                          !clampName(editingName) ||
                                          !!currentPlayerNameValidationMessage
                                        }
                                        aria-label={`Save ${displayName}`}
                                        title="Save"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        className="iconbtn iconbtn--sm managePlayersDialog__actionBtn"
                                        type="button"
                                        onClick={() => {
                                          setEditingPlayerId(null);
                                          setEditingName("");
                                          setEditingColor(player.avatarColor);
                                        }}
                                        aria-label={`Cancel editing ${displayName}`}
                                        title="Cancel"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                  <div
                                    className="managePlayersDialog__swatches"
                                    role="radiogroup"
                                    aria-label="Choose color for player"
                                  >
                                    {AVATAR_COLORS.map((color) => (
                                      <button
                                        key={color.id}
                                        type="button"
                                        className={
                                          color.value === editingColor
                                            ? "managePlayersDialog__swatch managePlayersDialog__swatch--selected"
                                            : "managePlayersDialog__swatch"
                                        }
                                        style={{ backgroundColor: color.value }}
                                        onClick={() =>
                                          setEditingColor(color.value)
                                        }
                                        aria-label={color.label}
                                        aria-checked={
                                          color.value === editingColor
                                        }
                                        role="radio"
                                      />
                                    ))}
                                  </div>
                                  {currentPlayerNameValidationMessage ? (
                                    <div
                                      className="managePlayersDialog__error"
                                      role="alert"
                                    >
                                      {currentPlayerNameValidationMessage}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="managePlayersDialog__identity">
                                  <div className="managePlayersDialog__identityTop">
                                    <span className="managePlayersDialog__name">
                                      {displayName}
                                    </span>
                                    <div className="managePlayersDialog__actionsRow">
                                      <button
                                        className="iconbtn iconbtn--sm managePlayersDialog__actionBtn"
                                        type="button"
                                        onClick={() => {
                                          setEditingPlayerId(player.id);
                                          setEditingName(player.name);
                                          setEditingColor(player.avatarColor);
                                        }}
                                        aria-label={`Edit ${displayName}`}
                                        title="Edit"
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          aria-hidden="true"
                                        >
                                          <path
                                            d="M4 20h4.2L18.6 9.6a1.6 1.6 0 0 0 0-2.2l-2-2a1.6 1.6 0 0 0-2.2 0L4 15.8V20Z"
                                            stroke="currentColor"
                                            strokeWidth="1.9"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                          <path
                                            d="m12.8 7.2 4 4"
                                            stroke="currentColor"
                                            strokeWidth="1.9"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      </button>
                                      <button
                                        className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--danger"
                                        type="button"
                                        onClick={() =>
                                          void onDeletePlayer(player.id)
                                        }
                                        aria-label={`Remove ${displayName}`}
                                        title="Remove"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : isPlayersGame ? (
                  <div className="managePlayersDialog__empty">
                    No players in this game yet.
                  </div>
                ) : null}

                {isPlayersGame && isAuthenticated ? (
                  <section className="managePlayersDialog__section managePlayersDialog__section--saved">
                    <div className="managePlayersDialog__sectionHeaderRow">
                      <div className="managePlayersDialog__simpleTitle">
                        Saved players
                      </div>
                      <label className="managePlayersDialog__searchInline">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="managePlayersDialog__searchIcon"
                        >
                          <circle
                            cx="11"
                            cy="11"
                            r="6"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="m20 20-4.2-4.2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <input
                          className="input input--compact managePlayersDialog__searchInput"
                          placeholder="Search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          aria-label="Search saved players"
                        />
                      </label>
                    </div>

                    {filteredProfiles.length > 0 ? (
                      <div className="managePlayersDialog__list managePlayersDialog__list--saved">
                        {filteredProfiles.map((profile) => {
                          const isTaken = takenProfileIds.has(profile.id);
                          const isStaged = stagedProfileIds.has(profile.id);
                          const displayName = profile.isAccountPlayer
                            ? formatAccountPlayerName(profile.name)
                            : capitalizeFirst(profile.name);

                          return (
                            <article
                              className="managePlayersDialog__card"
                              key={profile.id}
                            >
                              <div className="managePlayersDialog__cardMain">
                                <span
                                  className="managePlayersDialog__avatar"
                                  style={avatarStyleFor(profile.avatarColor)}
                                  aria-hidden="true"
                                >
                                  {getInitials(profile.name)}
                                </span>
                                <div className="managePlayersDialog__identity">
                                  <div className="managePlayersDialog__identityTop">
                                    <span className="managePlayersDialog__name">
                                      {displayName}
                                    </span>
                                    <div className="managePlayersDialog__actionsRow">
                                      {isTaken ? (
                                        <span className="pill pill--winner">
                                          In
                                        </span>
                                      ) : (
                                        <button
                                          className={`iconbtn iconbtn--sm managePlayersDialog__actionBtn${
                                            isStaged ? " iconbtn--primary" : ""
                                          }`}
                                          type="button"
                                          onClick={() =>
                                            toggleProfile(profile.id)
                                          }
                                          aria-label={
                                            isStaged
                                              ? `Remove ${displayName}`
                                              : `Add ${displayName}`
                                          }
                                          title={isStaged ? "Queued" : "Add"}
                                        >
                                          {isStaged ? "✓" : "+"}
                                        </button>
                                      )}
                                      {!profile.isAccountPlayer ? (
                                        <button
                                          className="iconbtn iconbtn--sm managePlayersDialog__actionBtn managePlayersDialog__actionBtn--danger"
                                          type="button"
                                          onClick={() =>
                                            onDeleteProfile(profile.id)
                                          }
                                          aria-label={`Delete saved player ${displayName}`}
                                          title="Delete saved player"
                                        >
                                          ×
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                  {isTaken ? (
                                    <span className="managePlayersDialog__meta">
                                      In game
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="managePlayersDialog__empty">
                        {search
                          ? "No saved players match that search."
                          : profiles.length > 0
                            ? "Every saved player is already in this game."
                            : "No saved players yet."}
                      </div>
                    )}
                  </section>
                ) : null}
              </div>

              <div className="managePlayersDialog__footer">
                {isPlayersGame ? (
                  <div className="dialog__actions managePlayersDialog__submitRow">
                    <button
                      className="btn btn--primary btn--wide"
                      type="button"
                      onClick={() => {
                        onStartGame(
                          Array.from(stagedProfileIds),
                          stagedCustomPlayers,
                        );
                        close();
                      }}
                      disabled={stagedCount === 0}
                    >
                      {submitLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="dialog__body managePlayersDialog__body"
            >
              <div className="managePlayersDialog__simpleTitle">
                Player name
              </div>

              <label className="managePlayersDialog__composer">
                <span
                  className="managePlayersDialog__avatar managePlayersDialog__avatar--preview"
                  style={avatarStyleFor(selectedColor)}
                  aria-hidden="true"
                >
                  {getInitials(pendingName || "P")}
                </span>
                <input
                  ref={nameInputRef}
                  className="input managePlayersDialog__composerInput"
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  autoComplete="off"
                  inputMode="text"
                  maxLength={28}
                  placeholder="e.g. John"
                  aria-label="Player name"
                  aria-invalid={!!newPlayerValidationMessage}
                />
              </label>

              {newPlayerValidationMessage ? (
                <div className="managePlayersDialog__error" role="alert">
                  {newPlayerValidationMessage}
                </div>
              ) : null}

              <div className="field">
                <span className="field__label">Player color</span>
                <div
                  className="managePlayersDialog__swatches"
                  role="radiogroup"
                  aria-label="Choose color for player"
                >
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      className={
                        color.value === selectedColor
                          ? "managePlayersDialog__swatch managePlayersDialog__swatch--selected"
                          : "managePlayersDialog__swatch"
                      }
                      style={{ backgroundColor: color.value }}
                      onClick={() => setSelectedColor(color.value)}
                      aria-label={color.label}
                      aria-checked={color.value === selectedColor}
                      role="radio"
                    />
                  ))}
                </div>
              </div>

              {isAuthenticated ? (
                <label className="managePlayersDialog__toggle">
                  <input
                    className="managePlayersDialog__toggleBox"
                    type="checkbox"
                    checked={saveForLater}
                    onChange={(e) => setSaveForLater(e.target.checked)}
                  />
                  <span>
                    Remember this player
                    <small>Use this player again in future games.</small>
                  </span>
                </label>
              ) : (
                <div className="managePlayersDialog__note">
                  Sign in to save this player for future games.
                </div>
              )}

              <div className="dialog__actions">
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => setIsCreating(false)}
                >
                  Back
                </button>
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={
                    !clampName(pendingName) || !!newPlayerValidationMessage
                  }
                >
                  Add player
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    );
  },
);
