import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";

type ConfirmPlayer = {
  name: string;
  avatarColor: string;
};

type ConfirmDetail = {
  label: string;
  value: string;
};

type ConfirmResult = "confirm" | "cancel" | "extra";

type ConfirmOptions = {
  title: string;
  bodyTitle?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  hideCancelAction?: boolean;
  extraActionText?: string;
  tone?: "default" | "danger";
  eyebrow?: string;
  highlights?: string[];
  details?: ConfirmDetail[];
  players?: ConfirmPlayer[];
  layout?: "default" | "feature";
};

export type ConfirmDialogHandle = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  choose: (options: ConfirmOptions) => Promise<ConfirmResult>;
};

function resolveEyebrow(next: ConfirmOptions): string {
  if (next.eyebrow?.trim()) return next.eyebrow;
  if (next.tone === "danger") return "Danger zone";
  if (next.layout === "feature") return "Game setup";

  const title = next.title.toLowerCase();
  if (title.includes("delete")) return "Delete check";
  if (title.includes("remove")) return "Roster change";
  if (title.includes("reset")) return "Score reset";
  if (title.includes("not signed in") || title.includes("sign in")) {
    return "Guest mode";
  }

  return "Quick confirm";
}

export const ConfirmDialog = forwardRef<ConfirmDialogHandle>(
  function ConfirmDialog(_, ref) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const resolverRef = useRef<((value: ConfirmResult) => void) | null>(null);
    const [options, setOptions] = useState<ConfirmOptions>({
      title: "",
      bodyTitle: "",
      message: "",
      confirmText: "Confirm",
      cancelText: "Cancel",
      hideCancelAction: false,
      extraActionText: "",
      tone: "default",
      eyebrow: "",
      highlights: [],
      details: [],
      players: [],
      layout: "default",
    });

    function closeWith(value: ConfirmResult) {
      dialogRef.current?.close();
      resolverRef.current?.(value);
      resolverRef.current = null;
    }

    useImperativeHandle(
      ref,
      () => ({
        choose: (next) => {
          setOptions({
            title: next.title,
            bodyTitle: next.bodyTitle ?? "",
            message: next.message,
            confirmText: next.confirmText ?? "Confirm",
            cancelText: next.cancelText ?? "Cancel",
            hideCancelAction: next.hideCancelAction ?? false,
            extraActionText: next.extraActionText ?? "",
            tone: next.tone ?? "default",
            eyebrow: resolveEyebrow(next),
            highlights: next.highlights ?? [],
            details: next.details ?? [],
            players: next.players ?? [],
            layout: next.layout ?? "default",
          });
          dialogRef.current?.showModal();
          return new Promise<ConfirmResult>((resolve) => {
            resolverRef.current = resolve;
          });
        },
        confirm: async (next) => {
          setOptions({
            title: next.title,
            bodyTitle: next.bodyTitle ?? "",
            message: next.message,
            confirmText: next.confirmText ?? "Confirm",
            cancelText: next.cancelText ?? "Cancel",
            hideCancelAction: next.hideCancelAction ?? false,
            extraActionText: "",
            tone: next.tone ?? "default",
            eyebrow: resolveEyebrow(next),
            highlights: next.highlights ?? [],
            details: next.details ?? [],
            players: next.players ?? [],
            layout: next.layout ?? "default",
          });
          dialogRef.current?.showModal();
          const result = await new Promise<ConfirmResult>((resolve) => {
            resolverRef.current = resolve;
          });
          return result === "confirm";
        },
      }),
      [],
    );

    return (
      <dialog
        className={`dialog dialog--confirm${options.layout === "feature" ? " dialog--confirmFeature" : ""}`}
        ref={dialogRef}
        onClose={() => {
          if (resolverRef.current) closeWith("cancel");
        }}
      >
        <form
          method="dialog"
          className="dialog__form"
          onSubmit={(e) => {
            e.preventDefault();
            closeWith("confirm");
          }}
        >
          <div className="dialog__head">
            <div className="dialog__titleWrap">
              {options.eyebrow ? (
                <div className="dialog__eyebrow">{options.eyebrow}</div>
              ) : null}
              <div className="dialog__title">{options.title}</div>
            </div>
            <button
              className="iconbtn"
              type="button"
              onClick={() => closeWith("cancel")}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="dialog__body">
            {options.bodyTitle ? (
              <div className="dialog__bodyTitle">{options.bodyTitle}</div>
            ) : null}
            {options.details?.length ? (
              <div className="dialog__detailList" aria-label="Game details">
                {options.details.map((detail) => (
                  <div
                    key={`${detail.label}-${detail.value}`}
                    className="dialog__detailRow"
                  >
                    <span className="dialog__detailLabel">{detail.label}</span>
                    <span className="dialog__detailValue">{detail.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {options.highlights?.length ? (
              <div className="dialog__highlights" aria-label="Game details">
                {options.highlights.map((highlight) => (
                  <span key={highlight} className="dialog__highlightChip">
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}
            {options.message && options.players?.length ? (
              <p className="dialog__message">{options.message}</p>
            ) : null}
            {options.players?.length ? (
              <div className="dialog__playerList" aria-label="Players">
                {options.players.map((player) => (
                  <div
                    key={`${player.name}-${player.avatarColor}`}
                    className="dialog__playerItem"
                  >
                    <span
                      className="dialog__playerAvatar"
                      style={avatarStyleFor(player.avatarColor)}
                      aria-hidden="true"
                    >
                      {getInitials(player.name)}
                    </span>
                    <span className="dialog__playerName">{player.name}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {options.message && !options.players?.length ? (
              <p className="dialog__message">{options.message}</p>
            ) : null}
          </div>

          <div className="dialog__actions">
            {!options.hideCancelAction ? (
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => closeWith("cancel")}
              >
                {options.cancelText ?? "Cancel"}
              </button>
            ) : null}
            {options.extraActionText ? (
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => closeWith("extra")}
              >
                {options.extraActionText}
              </button>
            ) : null}
            <button
              className={
                options.tone === "danger"
                  ? "btn btn--dangerSolid"
                  : "btn btn--primary"
              }
              type="submit"
            >
              {options.confirmText ?? "Confirm"}
            </button>
          </div>
        </form>
      </dialog>
    );
  },
);
