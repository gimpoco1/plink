import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AVATAR_COLORS } from "../../constants";
import type { PlayerProfile } from "../../types";
import { capitalizeFirst, clampName } from "../../utils/text";
import "./AddPlayerDialog.css";

export type AddPlayerDialogHandle = {
  open: () => void;
  close: () => void;
};

type StagedCustomPlayer = {
  name: string;
  avatarColor: string;
  saveForLater: boolean;
};

type Props = {
  profiles: PlayerProfile[];
  takenProfileIds: Set<string>;
  onDeleteProfile: (profileId: string) => void;
  onStartGame: (profileIds: string[], newPlayers: StagedCustomPlayer[]) => void;
};

export const AddPlayerDialog = forwardRef<AddPlayerDialogHandle, Props>(
  function AddPlayerDialog(
    { profiles, takenProfileIds, onDeleteProfile, onStartGame },
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

    const filteredProfiles = useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return profiles;
      return profiles.filter((p) => p.name.toLowerCase().includes(q));
    }, [profiles, search]);

    function open() {
      setPendingName("");
      setSelectedColor(AVATAR_COLORS[0]?.value ?? "#64748b");
      setSearch("");
      setSaveForLater(true);
      setIsCreating(false);
      setStagedProfileIds(new Set());
      setStagedCustomPlayers([]);
      dialogRef.current?.showModal();
    }

    function close() {
      dialogRef.current?.close();
    }

    useImperativeHandle(ref, () => ({ open, close }), []);

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
      if (!name) return;
      setStagedCustomPlayers((prev) => [
        ...prev,
        { name, avatarColor: selectedColor, saveForLater },
      ]);
      setPendingName("");
      setIsCreating(false);
    }

    return (
      <dialog
        className="dialog"
        ref={dialogRef}
        onClose={() => {
          setPendingName("");
          setIsCreating(false);
        }}
      >
        <div className="dialog__form">
          <div className="dialog__head">
            <div className="dialog__title">
              {isCreating ? "New player" : "Add players"}
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
            <div className="dialog__body">
              <div className="field">
                <input
                  className="input input--compact"
                  placeholder="Search past players"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search past players"
                />
              </div>

              <div className="profiles">
                {stagedCustomPlayers.map((p, idx) => (
                  <div className="profileRow" key={`staged-${idx}`}>
                    <div className="profileLeft">
                      <span
                        className="profileDot"
                        style={{ backgroundColor: p.avatarColor }}
                        aria-hidden="true"
                      />
                      <span className="profileName">
                        {capitalizeFirst(p.name)}
                      </span>
                    </div>
                    <div className="profileActions">
                      <button
                        className="btn btn--ghost btn--sm"
                        type="button"
                        onClick={() =>
                          setStagedCustomPlayers((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((p) => {
                    const isTaken = takenProfileIds.has(p.id);
                    const isStaged = stagedProfileIds.has(p.id);
                    const displayName = capitalizeFirst(p.name);
                    return (
                      <div className="profileRow" key={p.id}>
                        <div className="profileLeft">
                          <span
                            className="profileDot"
                            style={{ backgroundColor: p.avatarColor }}
                            aria-hidden="true"
                          />
                          <span className="profileName">{displayName}</span>
                        </div>
                        <div className="profileActions">
                          {isTaken ? (
                            <span className="pill">In game</span>
                          ) : (
                            <button
                              className="btn btn--ghost btn--sm"
                              type="button"
                              onClick={() => toggleProfile(p.id)}
                              aria-label={
                                isStaged
                                  ? `Remove ${displayName}`
                                  : `Add ${displayName}`
                              }
                            >
                              {isStaged ? "Remove" : "Add"}
                            </button>
                          )}
                          <button
                            className="iconbtn iconbtn--danger iconbtn--sm"
                            type="button"
                            onClick={() => onDeleteProfile(p.id)}
                            aria-label={`Delete saved player ${displayName}`}
                            title="Delete saved player"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M9 3h6m-8 4h10m-9 0 .7 13h6.6L16 7"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : !stagedCustomPlayers.length ? (
                  <div className="profilesEmpty">
                    {search ? "No matches" : "No saved players yet"}
                  </div>
                ) : null}
              </div>

              <button
                className="btn btn--ghost btn--wide btn--add-new"
                type="button"
                onClick={() => {
                  setIsCreating(true);
                  queueMicrotask(() => nameInputRef.current?.focus());
                }}
              >
                + Create new player
              </button>

              <div className="dialog__actions">
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
                  disabled={
                    stagedProfileIds.size === 0 &&
                    stagedCustomPlayers.length === 0
                  }
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="dialog__body"
            >
              <label className="field">
                <span className="field__label">Name</span>
                <input
                  ref={nameInputRef}
                  className="input"
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  autoComplete="off"
                  inputMode="text"
                  maxLength={28}
                  placeholder="Player name"
                />
              </label>

              <div className="field">
                <span className="field__label">Color</span>
                <div
                  className="swatches"
                  role="radiogroup"
                  aria-label="Choose avatar color"
                >
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={
                        c.value === selectedColor
                          ? "swatch swatch--selected"
                          : "swatch"
                      }
                      style={{ backgroundColor: c.value }}
                      onClick={() => setSelectedColor(c.value)}
                      aria-label={c.label}
                      aria-checked={c.value === selectedColor}
                      role="radio"
                    />
                  ))}
                </div>
              </div>

              <label className="checkRow">
                <input
                  className="checkRow__box"
                  type="checkbox"
                  checked={saveForLater}
                  onChange={(e) => setSaveForLater(e.target.checked)}
                />
                <span className="checkRow__text">
                  Save player for future games
                </span>
              </label>

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
                  disabled={!clampName(pendingName)}
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
