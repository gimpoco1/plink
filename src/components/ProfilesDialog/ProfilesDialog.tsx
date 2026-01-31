import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { AVATAR_COLORS } from "../../constants";
import type { PlayerProfile } from "../../types";
import { avatarStyleFor } from "../../utils/color";
import { formatPlayerName, getInitials } from "../../utils/text";
import "./ProfilesDialog.css";

export type ProfilesDialogHandle = {
  open: () => void;
  close: () => void;
};

type Props = {
  profiles: PlayerProfile[];
  onUpdateProfile: (
    id: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
  onDeleteProfile: (id: string) => void;
};

export const ProfilesDialog = forwardRef<ProfilesDialogHandle, Props>(
  function ProfilesDialog({ profiles, onUpdateProfile, onDeleteProfile }, ref) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    function open() {
      setEditingId(null);
      dialogRef.current?.showModal();
    }

    function close() {
      dialogRef.current?.close();
    }

    useImperativeHandle(ref, () => ({ open, close }), []);

    function startEditing(profile: PlayerProfile) {
      setEditingId(profile.id);
      setEditName(profile.name);
    }

    function saveName(profileId: string) {
      const name = formatPlayerName(editName);
      if (name) {
        onUpdateProfile(profileId, { name });
      }
      setEditingId(null);
    }

    return (
      <dialog ref={dialogRef} className="dialog profilesDialog">
        <div className="dialog__form">
          <div className="dialog__head">
            <h2 className="dialog__title">SAVED PLAYERS</h2>
            <button className="closeBtn" type="button" onClick={close}>
              ✕
            </button>
          </div>

          <div className="profilesList">
            {profiles.length === 0 ? (
              <div className="emptyMsg">No saved players yet.</div>
            ) : (
              profiles.map((p) => (
                <div key={p.id} className="profileItem">
                  <div className="profileItem__main">
                    <div
                      className="profileAvatar"
                      style={avatarStyleFor(p.avatarColor)}
                    >
                      {getInitials(p.name)}
                    </div>

                    {editingId === p.id ? (
                      <div className="editGroup">
                        <input
                          autoFocus
                          className="editInput"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveName(p.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button
                          className="miniBtn"
                          onClick={() => saveName(p.id)}
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div className="profileInfo">
                        <div
                          className="profileName"
                          onClick={() => startEditing(p)}
                          title="Click to rename"
                        >
                          {p.name}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="profileDetails">
                    <div className="colorWheel">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c.id}
                          className={`colorDot ${p.avatarColor === c.value ? "active" : ""}`}
                          style={{ backgroundColor: c.value }}
                          onClick={() =>
                            onUpdateProfile(p.id, { avatarColor: c.value })
                          }
                          title={c.label}
                        />
                      ))}
                    </div>

                    <button
                      className="deleteBtn"
                      type="button"
                      onClick={() => onDeleteProfile(p.id)}
                      title="Delete player"
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
              ))
            )}
          </div>

          <div className="dialog__actions">
            <button className="btn btn--primary" type="button" onClick={close}>
              Done
            </button>
          </div>
        </div>
      </dialog>
    );
  },
);
