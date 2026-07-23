import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link, LoaderCircle, RefreshCw } from "lucide-react";
import { CollaboratorManagementControl } from "../CollaboratorManagementControl/CollaboratorManagementControl";
import type { Game } from "../../types";
import { supabase } from "../../lib/supabase";
import {
  loadGameInviteCode,
  saveGameInviteCode,
} from "../../storage/gameInviteStorage";
import "./GameSharing.css";

type Props = {
  open: boolean;
  game: Game;
  onClose: () => void;
  onCreateInvite: (gameId: string) => Promise<string>;
  onRotateInvite?: (gameId: string) => Promise<string | null>;
  onCollaboratorManagementChange: (enabled: boolean) => void;
};

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Could not create an invitation. Please try again.";
}

export function GameSharingDialog({
  open,
  game,
  onClose,
  onCreateInvite,
  onRotateInvite,
  onCollaboratorManagementChange,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const createInviteRef = useRef(onCreateInvite);
  const [loadedCode, setLoadedCode] = useState<{
    gameId: string;
    value: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotationLimitGameId, setRotationLimitGameId] = useState<
    string | null
  >(null);
  const rotationLimitReached = rotationLimitGameId === game.id;
  const code =
    loadedCode?.gameId === game.id
      ? loadedCode.value
      : (loadGameInviteCode(game.id) ?? "");

  useEffect(() => {
    createInviteRef.current = onCreateInvite;
  }, [onCreateInvite]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) dialog.showModal();
    setError("");
    setCopied(false);
    const cachedCode = loadGameInviteCode(game.id);
    if (cachedCode) {
      setLoadedCode({ gameId: game.id, value: cachedCode });
    } else {
      setLoadedCode(null);
    }

    setLoading(true);
    let active = true;
    void createInviteRef
      .current(game.id)
      .then((nextCode) => {
        if (!active) return;
        setLoadedCode({ gameId: game.id, value: nextCode });
      })
      .catch((nextError) => {
        if (active) setError(errorMessage(nextError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [game.id, open]);

  useEffect(() => {
    const canReceiveCodeUpdates =
      game.accessRole !== "collaborator" || game.collaboratorsCanManage;
    const realtimeClient = supabase;
    if (!open || !realtimeClient || !canReceiveCodeUpdates) return;

    const channel = realtimeClient.channel(`game-invite:${game.id}`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "game_invites",
        filter: `game_id=eq.${game.id}`,
      },
      (payload) => {
        const nextCode = (payload.new as { code?: unknown }).code;
        if (typeof nextCode !== "string" || !/^[A-F0-9]{8}$/.test(nextCode)) {
          return;
        }
        saveGameInviteCode(game.id, nextCode);
        setLoadedCode({ gameId: game.id, value: nextCode });
        setCopied(false);
        setError("");
      },
    );
    void channel.subscribe();

    return () => {
      void channel.unsubscribe();
      realtimeClient.removeChannel(channel);
    };
  }, [game.accessRole, game.collaboratorsCanManage, game.id, open]);

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the code. You can select it manually.");
    }
  }

  async function rotateCode() {
    if (!onRotateInvite || rotating) return;
    setError("");
    setCopied(false);
    setRotating(true);
    try {
      const nextCode = await onRotateInvite(game.id);
      if (nextCode) setLoadedCode({ gameId: game.id, value: nextCode });
    } catch (nextError) {
      const message = errorMessage(nextError);
      setError(message);
      if (message.includes("Invitation code limit reached")) {
        setRotationLimitGameId(game.id);
      }
    } finally {
      setRotating(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog gameSharingDialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="dialog__form gameSharingDialog__form">
        <div className="dialog__head">
          <div className="dialog__titleWrap">
            <div className="dialog__eyebrow">Shared game</div>
            <div className="dialog__title">Invite players</div>
          </div>
          <button
            className="iconbtn"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="gameSharingDialog__body">
          <div className="gameSharingDialog__intro">
            <span className="gameSharingDialog__icon" aria-hidden="true">
              <Link size={22} strokeWidth={2.3} />
            </span>
            <p>
              Share this code. When someone joins, their account player is added
              and they can update the score from their device.
            </p>
          </div>

          <div
            className="gameSharingDialog__code"
            aria-live="polite"
            aria-busy={loading && !code}
          >
            {code ? (
              code
            ) : loading ? (
              <LoaderCircle
                className="gameSharingDialog__loader"
                size={32}
                strokeWidth={2.4}
                aria-label="Loading invitation code"
              />
            ) : (
              "—"
            )}
          </div>
          {game.accessRole !== "collaborator" && onRotateInvite ? (
            <button
              className="gameSharingDialog__rotate"
              type="button"
              disabled={loading || rotating || !code || rotationLimitReached}
              onClick={() => void rotateCode()}
            >
              {rotating ? (
                <LoaderCircle
                  className="gameSharingDialog__loader"
                  size={17}
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw size={17} strokeWidth={2.3} aria-hidden="true" />
              )}
              {rotating
                ? "Generating new code…"
                : rotationLimitReached
                  ? "Code limit reached"
                  : "Generate new code"}
            </button>
          ) : null}
          {game.accessRole !== "collaborator" ? (
            <CollaboratorManagementControl
              enabled={game.collaboratorsCanManage}
              onChange={onCollaboratorManagementChange}
            />
          ) : null}
          {error ? (
            <p className="gameSharingDialog__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="dialog__actions">
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Done
          </button>
          <button
            className="btn btn--primary"
            type="button"
            disabled={!code || loading}
            onClick={() => void copyCode()}
          >
            {copied ? (
              <Check size={17} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Copy size={17} strokeWidth={2.3} aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
