import { useMemo, useState } from "react";
import { AVATAR_COLORS } from "../constants";
import type { Game, PlayerProfile } from "../types";
import { LockedFrame } from "../components/HomeLockedState/LockedFrame";
import { PlayersSkeleton } from "../components/HomeLockedState/PlayersSkeleton";
import { LocalSessionsHint } from "../components/LocalSessionsHint/LocalSessionsHint";
import { avatarStyleFor } from "../utils/color";
import {
  computeProfileStats,
  createEmptyProfileStats,
} from "../utils/profileStats";
import {
  formatAccountPlayerName,
  formatPlayerName,
  getInitials,
} from "../utils/text";
import { SwipeableCard } from "../components/SwipeableCard/SwipeableCard";
import "./PlayersScreen.css";
import { Check, Pencil, Trash2, Undo2 } from "lucide-react";

type PlayersScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  isAuthenticated: boolean;
  showLocalSessionsHint: boolean;
  pendingLocalSessionsCount: number;
  onDismissLocalSessionsHint: () => void;
  addingPlayer: boolean;
  onAddingPlayerChange: (adding: boolean) => void;
  onOpenAuth: () => void;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onUpdateProfile: (
    id: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
  onDeleteProfile: (id: string) => void;
};

export function PlayersScreen({
  games,
  profiles,
  isAuthenticated,
  showLocalSessionsHint,
  pendingLocalSessionsCount,
  onDismissLocalSessionsHint,
  addingPlayer,
  onAddingPlayerChange,
  onOpenAuth,
  onUpsertProfile,
  onUpdateProfile,
  onDeleteProfile,
}: PlayersScreenProps) {
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
  const profileStats = useMemo(() => computeProfileStats(games), [games]);
  const overview = useMemo(() => {
    let sessions = 0;
    let active = 0;
    let wins = 0;
    profileStats.forEach((stats) => {
      sessions += stats.gamesPlayed;
      active += stats.inProgressGames;
      wins += stats.wins;
    });
    return { sessions, active, wins };
  }, [profileStats]);

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

  const hasEdits = Boolean(
    editingId &&
    (editingName !== editingOriginalName ||
      editingColor !== editingOriginalColor),
  );

  return (
    <div className="tabContent tabContent--players">
      {showLocalSessionsHint ? (
        <LocalSessionsHint
          className="profilesHint"
          count={pendingLocalSessionsCount}
          onDismiss={onDismissLocalSessionsHint}
          onAdd={onOpenAuth}
        />
      ) : null}
      <div className="tabHeader">
        <div>
          <h2 className="tabTitle">Players</h2>
          <p className="tabSubtitle">
            Reuse profiles and track cumulative results across sessions.
          </p>
        </div>
      </div>
      {!isAuthenticated ? (
        <LockedFrame
          title="Sign in to see saved players."
          onSignIn={onOpenAuth}
        >
          <PlayersSkeleton />
        </LockedFrame>
      ) : (
        <>
          <div className="profilesOverview">
            <Overview label="Saved" value={profiles.length} />
            <Overview label="Sessions" value={overview.sessions} />
            <Overview label="Wins" value={overview.wins} />
            <Overview label="Active" value={overview.active} />
          </div>
          <div className="profilesGrid">
            {addingPlayer ? (
              <div className="profileCard profileCard--new">
                <div className="profileCard__main">
                  <span
                    className="profileAvatar"
                    style={avatarStyleFor(newColor)}
                  >
                    {newName.trim() ? getInitials(newName) : "+"}
                  </span>
                  <div className="editGroup">
                    <input
                      autoFocus
                      className="editInput"
                      placeholder="Player Name"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") createProfile();
                        if (event.key === "Escape") onAddingPlayerChange(false);
                      }}
                    />
                  </div>
                </div>
                <div className="profileCard__footer">
                  <ColorPicker
                    value={newColor}
                    onChange={setNewColor}
                    label="new player"
                  />
                  <div className="newProfileActions">
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
              </div>
            ) : null}

            {!profiles.length && !addingPlayer ? (
              <div className="emptyMsg">No saved players yet.</div>
            ) : (
              profiles.map((profile) => {
                const stats =
                  profileStats.get(profile.id) ?? createEmptyProfileStats();
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
                                isEditing ? editingColor : profile.avatarColor,
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
                                        ? formatAccountPlayerName(profile.name)
                                        : profile.name}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* editor area removed — palette rendered in its own row below when editing */}
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

                        {/** Palette is shown only inside the editor when editing. */}

                        <div
                          className="profileStatsRow"
                          aria-label={`${profile.name} cumulative stats`}
                        >
                          <Stat label="Wins" value={stats.wins} />
                          <Stat
                            label="Rate"
                            value={
                              stats.completedGames ? `${stats.winRate}%` : "—"
                            }
                          />
                          <Stat label="Done" value={stats.completedGames} />
                          <Stat
                            label="Streak"
                            value={
                              stats.currentWinStreak
                                ? `${stats.currentWinStreak}x`
                                : "—"
                            }
                          />
                        </div>

                        {stats.gameResults.length ? (
                          <details className="profileGamesDropdown">
                            <summary className="profileGamesDropdown__summary">
                              <div className="profileGamesDropdown__summaryLeft">
                                <span>Games</span>
                                {stats.topWonGame ? (
                                  <span className="profileGamesDropdown__topGame">
                                    <span className="profileGamesDropdown__topGameLabel">
                                      Top game
                                    </span>
                                    <strong>{stats.topWonGame.name}</strong>
                                    <span>
                                      {stats.topWonGame.wins}{" "}
                                      {stats.topWonGame.wins === 1
                                        ? "win"
                                        : "wins"}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
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

                        {/** footer removed per design: no hint or delete here */}
                      </>
                    )}
                  </SwipeableCard>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Overview({ label, value }: { label: string; value: number }) {
  return (
    <div className="profilesOverview__item">
      <span className="profilesOverview__label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="profileStatPill">
      <span className="profileStatPill__label">{label}</span>
      <strong className="profileStatPill__value">{value}</strong>
    </div>
  );
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
