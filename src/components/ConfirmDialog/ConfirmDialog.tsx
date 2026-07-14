import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ConfirmDialogBody } from "./ConfirmDialogBody";
import {
  resolveConfirmEyebrow,
  type ConfirmDialogHandle,
  type ConfirmOptions,
  type ConfirmResult,
  type PromptOptions,
} from "./confirmDialogTypes";

export type { ConfirmDialogHandle } from "./confirmDialogTypes";

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
      settingChips: [],
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
            eyebrow: resolveConfirmEyebrow(next),
            highlights: next.highlights ?? [],
            details: next.details ?? [],
            settingChips: next.settingChips ?? [],
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
            eyebrow: resolveConfirmEyebrow(next),
            highlights: next.highlights ?? [],
            details: next.details ?? [],
            settingChips: next.settingChips ?? [],
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
            settingChips: [],
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
              onClick={() =>
                isPrompt ? closePrompt(null) : closeWith("cancel")
              }
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <ConfirmDialogBody
            options={options}
            promptOptions={promptOptions}
            promptValue={promptValue}
            isPrompt={isPrompt}
            onPromptValueChange={setPromptValue}
          />

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
              className={`${
                options.tone === "danger"
                  ? "btn btn--dangerSolid"
                  : "btn btn--primary"
              }${
                options.extraActionText
                  ? " dialog__actionBtn dialog__actionBtn--choice"
                  : ""
              }`}
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
