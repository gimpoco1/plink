import { getCurrentLanguage, translate } from "../../i18n/translate";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import type { GameComment } from "../../types";
import { getInitials } from "../../utils/text";
import "./GameCommentsDialog.css";

type Props = {
  open: boolean;
  comments: GameComment[];
  currentAuthorId: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onAdd: (body: string) => Promise<boolean>;
  onUpdate: (commentId: string, body: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
};

function formatCommentTime(timestamp: number) {
  return new Intl.DateTimeFormat(getCurrentLanguage(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function GameCommentsDialog({
  open,
  comments,
  currentAuthorId,
  loading,
  error,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      const list = listRef.current;
      if (list) list.scrollTop = list.scrollHeight;
    });
  }, [comments.length, open]);

  async function submit() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    const saved = editingId
      ? await onUpdate(editingId, body)
      : await onAdd(body);
    setBusy(false);
    if (!saved) return;
    setDraft("");
    setEditingId(null);
  }

  function hasPhysicalKeyboardLayout() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog gameCommentsDialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="gameCommentsDialog__layout">
        <div className="dialog__head gameCommentsDialog__head">
          <div className="dialog__titleWrap">
            <div className="dialog__eyebrow">
              {translate("copy.gameNotes")}
            </div>
            <div className="dialog__title">{translate("copy.comments")}</div>
          </div>
          <button
            className="iconbtn"
            type="button"
            onClick={onClose}
            aria-label={translate("copy.closeComments")}
          >
            ×
          </button>
        </div>

        <div
          ref={listRef}
          className="gameCommentsDialog__list"
          aria-live="polite"
        >
          {loading && comments.length === 0 ? (
            <div className="gameCommentsDialog__empty">
              {translate("copy.loadingComments")}
            </div>
          ) : comments.length === 0 ? (
            <div className="gameCommentsDialog__empty">
              <MessageCircle size={28} strokeWidth={1.8} aria-hidden="true" />
              <strong>{translate("copy.noCommentsYet")}</strong>
              <span>
                {translate("copy.addANoteYouCanReturnToLater")}
              </span>
            </div>
          ) : (
            comments.map((comment) => {
              const isOwn = comment.authorUserId === currentAuthorId;
              return (
                <article className="gameComment" key={comment.id}>
                  <span
                    className="gameComment__avatar"
                    style={{ background: comment.authorAvatarColor }}
                    aria-hidden="true"
                  >
                    {getInitials(comment.authorName)}
                  </span>
                  <div className="gameComment__content">
                    <div className="gameComment__meta">
                      <strong>{isOwn ? translate("copy.you") : comment.authorName}</strong>
                      <time
                        dateTime={new Date(comment.createdAt).toISOString()}
                      >
                        {formatCommentTime(comment.createdAt)}
                        {comment.updatedAt > comment.createdAt
                          ? " · Edited"
                          : ""}
                      </time>
                    </div>
                    <p>{comment.body}</p>
                  </div>
                  {isOwn ? (
                    <div className="gameComment__actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(comment.id);
                          setDraft(comment.body);
                        }}
                        aria-label={translate("copy.editComment")}
                      >
                        <Pencil
                          size={15}
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(comment.id)}
                        aria-label={translate("copy.deleteComment")}
                      >
                        <Trash2
                          size={15}
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>

        {error ? (
          <div className="gameCommentsDialog__error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="gameCommentsDialog__composer">
          {editingId ? (
            <button
              className="gameCommentsDialog__cancelEdit"
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft("");
              }}
            >
              {translate("copy.cancelEdit")}
            </button>
          ) : null}
          <div className="gameCommentsDialog__inputRow">
            <textarea
              value={draft}
              maxLength={500}
              rows={1}
              placeholder={translate("copy.addAComment")}
              aria-label={translate("copy.comment")}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key !== "Enter" ||
                  event.shiftKey ||
                  event.nativeEvent.isComposing
                ) {
                  return;
                }

                if (!hasPhysicalKeyboardLayout()) {
                  return;
                }

                event.preventDefault();
                void submit();
              }}
            />
            <button
              type="button"
              disabled={!draft.trim() || busy}
              onClick={() => void submit()}
              aria-label={editingId ? "Save comment" : "Post comment"}
            >
              <Send size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
