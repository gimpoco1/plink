import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { DEFAULT_TEAM_ICON } from "../../constants";
import { avatarStyleFor } from "../../utils/color";
import { getInitials } from "../../utils/text";
import {
  Dumbbell,
  Flag,
  Flame,
  Shield,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

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

type ConfirmPlayer = {
  name: string;
  avatarColor: string;
};

type ConfirmDetail = {
  label: string;
  value: string;
};

type ConfirmTeam = {
  id: string;
  name: string;
  icon?: string;
  members: ConfirmPlayer[];
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
  teams?: ConfirmTeam[];
  layout?: "default" | "feature";
};

type PromptOptions = {
  title: string;
  message: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  eyebrow?: string;
  maxLength?: number;
};

export type ConfirmDialogHandle = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  choose: (options: ConfirmOptions) => Promise<ConfirmResult>;
  prompt: (options: PromptOptions) => Promise<string | null>;
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
    const promptResolverRef = useRef<((value: string | null) => void) | null>(
      null,
    );
    const [promptValue, setPromptValue] = useState("");
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
      teams: [],
      layout: "default",
    });
    const [promptOptions, setPromptOptions] = useState<PromptOptions | null>(
      null,
    );

    const isPrompt = promptOptions !== null;

    function closeWith(value: ConfirmResult) {
      dialogRef.current?.close();
      resolverRef.current?.(value);
      resolverRef.current = null;
    }

    function closePrompt(value: string | null) {
      dialogRef.current?.close();
      promptResolverRef.current?.(value);
      promptResolverRef.current = null;
      setPromptOptions(null);
      setPromptValue("");
    }

    useImperativeHandle(
      ref,
      () => ({
        choose: (next) => {
          setPromptOptions(null);
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
            teams: next.teams ?? [],
            layout: next.layout ?? "default",
          });
          dialogRef.current?.showModal();
          return new Promise<ConfirmResult>((resolve) => {
            resolverRef.current = resolve;
          });
        },
        confirm: async (next) => {
          setPromptOptions(null);
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
            teams: next.teams ?? [],
            layout: next.layout ?? "default",
          });
          dialogRef.current?.showModal();
          const result = await new Promise<ConfirmResult>((resolve) => {
            resolverRef.current = resolve;
          });
          return result === "confirm";
        },
        prompt: async (next) => {
          setPromptOptions(next);
          setPromptValue(next.initialValue ?? "");
          setOptions({
            title: next.title,
            bodyTitle: "",
            message: next.message,
            confirmText: next.confirmText ?? "Save",
            cancelText: next.cancelText ?? "Cancel",
            hideCancelAction: false,
            extraActionText: "",
            tone: "default",
            eyebrow: next.eyebrow ?? "Edit",
            highlights: [],
            details: [],
            players: [],
            teams: [],
            layout: "default",
          });
          dialogRef.current?.showModal();
          return new Promise<string | null>((resolve) => {
            promptResolverRef.current = resolve;
          });
        },
      }),
      [],
    );

    return (
      <dialog
        className={`dialog dialog--confirm${options.layout === "feature" ? " dialog--confirmFeature" : ""}`}
        ref={dialogRef}
        onClose={() => {
          if (promptResolverRef.current) closePrompt(null);
          if (resolverRef.current) closeWith("cancel");
        }}
      >
        <form
          method="dialog"
          className="dialog__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (isPrompt) {
              const value = promptValue.trim();
              if (value) closePrompt(value);
              return;
            }
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
              onClick={() => (isPrompt ? closePrompt(null) : closeWith("cancel"))}
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
            {options.message &&
            (options.players?.length || options.teams?.length) ? (
              <p className="dialog__message">{options.message}</p>
            ) : null}
            {options.teams?.length ? (
              <div className="dialog__teamList" aria-label="Teams">
                {options.teams.map((team) => (
                  <div
                    key={`${team.id}-${team.name}`}
                    className="dialog__teamItem"
                  >
                    <span className="dialog__teamIcon" aria-hidden="true">
                      <TeamIconGlyph icon={team.icon} size={18} />
                    </span>
                    <span className="dialog__teamCopy">
                      <span className="dialog__teamName">{team.name}</span>
                      <span className="dialog__teamMeta">
                        {team.members.length}{" "}
                        {team.members.length === 1 ? "player" : "players"}
                      </span>
                    </span>
                    {team.members.length ? (
                      <span className="dialog__teamMembers" aria-hidden="true">
                        {team.members.slice(0, 4).map((player) => (
                          <span
                            key={`${team.id}-${player.name}-${player.avatarColor}`}
                            className="dialog__teamMemberAvatar"
                            style={avatarStyleFor(player.avatarColor)}
                          >
                            {getInitials(player.name)}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
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
            {options.message &&
            !options.players?.length &&
            !options.teams?.length ? (
              <p className="dialog__message">{options.message}</p>
            ) : null}
            {isPrompt ? (
              <input
                className="input"
                type="text"
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                placeholder={promptOptions?.placeholder}
                maxLength={promptOptions?.maxLength}
                autoFocus
              />
            ) : null}
          </div>

          <div
            className={`dialog__actions${
              options.extraActionText ? " dialog__actions--decision" : ""
            }`}
          >
            {!options.hideCancelAction ? (
              <button
                className={`btn btn--ghost${
                  options.extraActionText
                    ? " dialog__actionBtn dialog__actionBtn--cancel"
                    : ""
                }`}
                type="button"
                onClick={() =>
                  isPrompt ? closePrompt(null) : closeWith("cancel")
                }
              >
                {options.cancelText ?? "Cancel"}
              </button>
            ) : null}
            {options.extraActionText ? (
              <button
                className="btn btn--ghost dialog__actionBtn dialog__actionBtn--choice dialog__actionBtn--extra"
                type="button"
                onClick={() => closeWith("extra")}
              >
                {options.extraActionText}
              </button>
            ) : null}
            <button
              className={
                `${
                  options.tone === "danger"
                    ? "btn btn--dangerSolid"
                    : "btn btn--primary"
                }${
                  options.extraActionText
                    ? " dialog__actionBtn dialog__actionBtn--choice"
                    : ""
                }`
              }
              type="submit"
              disabled={isPrompt && !promptValue.trim()}
            >
              {options.confirmText ?? "Confirm"}
            </button>
          </div>
        </form>
      </dialog>
    );
  },
);

function TeamIconGlyph({
  icon,
  size = 18,
  strokeWidth = 2.35,
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
