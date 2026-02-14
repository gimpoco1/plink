import { useMemo, useState } from "react";
import type { Game, PlayerProfile } from "../types";
import { GameRowCard } from "../components/GameRowCard";
import { avatarStyleFor } from "../utils/color";
import { AVATAR_COLORS } from "../constants";
import { findWinner } from "../utils/ranking";
import { formatPlayerName, getInitials } from "../utils/text";
import "./HomeScreen.css";

type StagedPlayer = {
  name: string;
  avatarColor: string;
};

type Props = {
  games: Game[];
  profiles: PlayerProfile[];
  onCreate: (input: {
    name: string;
    targetPoints: number;
    isLowScoreWins: boolean;
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
}: Props) {
  const [activeTab, setActiveTab] = useState<"home" | "players">("home");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("8");
  const [isLowScoreWins, setIsLowScoreWins] = useState(false);
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

  // Auto-show form if no games exist
  const showForm = isCreating || games.length === 0;

  const parsedTarget = useMemo(() => Number.parseInt(target, 10), [target]);
  const canCreate =
    name.trim().length > 0 &&
    Number.isFinite(parsedTarget) &&
    parsedTarget > 0 &&
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

  const profileWins = useMemo(() => {
    const wins = new Map<string, number>();
    games.forEach((game) => {
      const winner = findWinner(
        game.players,
        game.targetPoints,
        game.isLowScoreWins,
      );
      if (winner?.profileId) {
        wins.set(winner.profileId, (wins.get(winner.profileId) || 0) + 1);
      }
    });
    return wins;
  }, [games]);

  return (
    <div className="homeContainer">
      <main className="homeScreen">
        <div className="tabSlider" data-active={activeTab}>
          <div className="tabWindow">
            <div className="tabContent tabContent--home">
              {showForm && (
                <section className="homeCard createCard">
                  <div className="homeCard__header">
                    <div className="homeCard__title">Create new game</div>
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
                          onChange={(e) =>
                            setIsLowScoreWins(e.target.checked)
                          }
                        />
                        <span>Reverse scoring (higher score loses)</span>
                      </label>
                      <span className="field__label">Add players</span>
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
                          initialPlayers: [...pList, ...sList],
                        });
                      }}
                    >
                      Start Game
                    </button>
                  </div>
                </section>
              )}

              {games.length > 0 && (
                <section className="homeList" aria-label="Game history">
                  <div className="homeList__title">Recent Sessions</div>
                  <div className="gameRows">
                    {games.map((g) => {
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
                </section>
              )}
            </div>
          </div>

          <div className="tabWindow">
            <div className="tabContent tabContent--players">
              <div className="tabHeader">
                <h2 className="tabTitle">Saved Players</h2>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => setIsAddingInTab(true)}
                >
                  + New Player
                </button>
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
                    const wins = profileWins.get(p.id) || 0;
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
                              <div
                                className="profileCard__name"
                                onClick={() => {
                                  setEditingProfileId(p.id);
                                  setEditProfileName(p.name);
                                }}
                              >
                                {p.name}
                              </div>
                              <div className="profileCard__stats">
                                {wins} {wins === 1 ? "win" : "wins"}
                              </div>
                            </div>
                          )}
                        </div>

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
                              />
                            ))}
                          </div>
                          <button
                            className="deleteBtn"
                            type="button"
                            onClick={() => onDeleteProfile(p.id)}
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
          className="tabItem tabItem--action"
          onClick={() => {
            setActiveTab("home");
            setIsCreating(true);
            setSelectedProfileIds(new Set());
            setStagedPlayers([]);
          }}
          aria-label="New Game"
        >
          <div className="actionCircle">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </button>

        <button
          className="tabItem"
          data-active={activeTab === "players"}
          onClick={() => setActiveTab("players")}
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
