import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ConfirmDialogBody } from "./ConfirmDialogBody";
import {
  resolveConfirmEyebrow,
  type ConfirmDialogHandle,
  type ConfirmOptions,
  type ConfirmPlayerMultiSelectionOptions,
  type ConfirmPlayerSelectionOptions,
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
    const playerSelectionResolverRef = useRef<
      ((value: string | null) => void) | null
    >(null);
    const playerMultiSelectionResolverRef = useRef<
      ((value: string[] | null) => void) | null
    >(null);
    const [promptValue, setPromptValue] = useState("");
    const [selectedPlayerId, setSelectedPlayerId] = useState("");
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [isPlayerSelection, setIsPlayerSelection] = useState(false);
    const [isPlayerMultiSelection, setIsPlayerMultiSelection] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({
      title: "",
      bodyTitle: "",
      message: "",
      messageCase: "default",
      confirmText: "Confirm",
      cancelText: "Cancel",
      hideCancelAction: false,
      extraActionText: "",
      extraActionDescription: "",
      tone: "default",
      eyebrow: "",
      highlights: [],
      details: [],
      detailFlow: false,
      settingChips: [],
      playersTitle: "",
      players: [],
      teams: [],
      rosterNotice: undefined,
      layout: "default",
      selectablePlayers: false,
      multiSelectablePlayers: false,
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

    function closePlayerSelection(value: string | null) {
      dialogRef.current?.close();
      playerSelectionResolverRef.current?.(value);
      playerSelectionResolverRef.current = null;
      setIsPlayerSelection(false);
      setSelectedPlayerId("");
    }

    function closePlayerMultiSelection(value: string[] | null) {
      dialogRef.current?.close();
      playerMultiSelectionResolverRef.current?.(value);
      playerMultiSelectionResolverRef.current = null;
      setIsPlayerMultiSelection(false);
      setSelectedPlayerIds([]);
    }

    function setConfirmOptions(next: ConfirmOptions) {
      setOptions({
        title: next.title,
        bodyTitle: next.bodyTitle ?? "",
        message: next.message,
        messageCase: next.messageCase ?? "default",
        confirmText: next.confirmText ?? "Confirm",
        cancelText: next.cancelText ?? "Cancel",
        hideCancelAction: next.hideCancelAction ?? false,
        extraActionText: next.extraActionText ?? "",
        extraActionDescription: next.extraActionDescription ?? "",
        tone: next.tone ?? "default",
        eyebrow: resolveConfirmEyebrow(next),
        highlights: next.highlights ?? [],
        details: next.details ?? [],
        detailFlow: next.detailFlow ?? false,
        settingChips: next.settingChips ?? [],
        playersTitle: next.playersTitle ?? "",
        players: next.players ?? [],
        teams: next.teams ?? [],
        rosterNotice: next.rosterNotice,
        layout: next.layout ?? "default",
        selectablePlayers: next.selectablePlayers ?? false,
        multiSelectablePlayers: next.multiSelectablePlayers ?? false,
      });
    }

    useImperativeHandle(
      ref,
      () => ({
        choose: (next) => {
          setPromptOptions(null);
          setIsPlayerSelection(false);
          setIsPlayerMultiSelection(false);
          setConfirmOptions(next);
          dialogRef.current?.showModal();
          return new Promise<ConfirmResult>((resolve) => {
            resolverRef.current = resolve;
          });
        },
        confirm: async (next) => {
          setPromptOptions(null);
          setIsPlayerSelection(false);
          setIsPlayerMultiSelection(false);
          setConfirmOptions({ ...next, extraActionText: "" });
          dialogRef.current?.showModal();
          const result = await new Promise<ConfirmResult>((resolve) => {
            resolverRef.current = resolve;
          });
          return result === "confirm";
        },
        selectPlayer: async (next: ConfirmPlayerSelectionOptions) => {
          setPromptOptions(null);
          setIsPlayerSelection(true);
          setIsPlayerMultiSelection(false);
          setSelectedPlayerId(next.initialSelectedPlayerId ?? "");
          setConfirmOptions({
            ...next,
            selectablePlayers: true,
            extraActionText: "",
          });
          dialogRef.current?.showModal();
          return new Promise<string | null>((resolve) => {
            playerSelectionResolverRef.current = resolve;
          });
        },
        selectPlayers: async (
          next: ConfirmPlayerMultiSelectionOptions,
        ) => {
          setPromptOptions(null);
          setIsPlayerSelection(false);
          setIsPlayerMultiSelection(true);
          setSelectedPlayerIds(next.initialSelectedPlayerIds ?? []);
          setConfirmOptions({
            ...next,
            selectablePlayers: false,
            multiSelectablePlayers: true,
            extraActionText: "",
          });
          dialogRef.current?.showModal();
          return new Promise<string[] | null>((resolve) => {
            playerMultiSelectionResolverRef.current = resolve;
          });
        },
        prompt: async (next) => {
          setIsPlayerSelection(false);
          setIsPlayerMultiSelection(false);
          setPromptOptions(next);
          setPromptValue(next.initialValue ?? "");
          setOptions({
            title: next.title,
            bodyTitle: "",
            message: next.message,
            messageCase: "default",
            confirmText: next.confirmText ?? "Save",
            cancelText: next.cancelText ?? "Cancel",
            hideCancelAction: false,
            extraActionText: "",
            extraActionDescription: "",
            tone: "default",
            eyebrow: next.eyebrow ?? "Edit",
            highlights: [],
            details: [],
            detailFlow: false,
            settingChips: [],
            playersTitle: "",
            players: [],
            teams: [],
            rosterNotice: undefined,
            layout: "default",
            selectablePlayers: false,
            multiSelectablePlayers: false,
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
          if (playerSelectionResolverRef.current) closePlayerSelection(null);
          if (playerMultiSelectionResolverRef.current) {
            closePlayerMultiSelection(null);
          }
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
            if (isPlayerSelection) {
              if (selectedPlayerId) closePlayerSelection(selectedPlayerId);
              return;
            }
            if (isPlayerMultiSelection) {
              closePlayerMultiSelection(selectedPlayerIds);
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
                isPrompt
                  ? closePrompt(null)
                  : isPlayerSelection
                    ? closePlayerSelection(null)
                    : isPlayerMultiSelection
                      ? closePlayerMultiSelection(null)
                    : closeWith("cancel")
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
            selectedPlayerId={selectedPlayerId}
            onPlayerSelect={setSelectedPlayerId}
            selectedPlayerIds={selectedPlayerIds}
            onPlayerMultiSelect={(playerId) =>
              setSelectedPlayerIds((current) =>
                current.includes(playerId)
                  ? current.filter((id) => id !== playerId)
                  : [...current, playerId],
              )
            }
          />

          <div
            className={`dialog__actions${
              options.extraActionText ? " dialog__actions--decision" : ""
            }${
              isPlayerSelection || isPlayerMultiSelection
                ? " dialog__actions--selection"
                : ""
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
                  isPrompt
                  ? closePrompt(null)
                  : isPlayerSelection
                    ? closePlayerSelection(null)
                    : isPlayerMultiSelection
                      ? closePlayerMultiSelection(null)
                    : closeWith("cancel")
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
                <span className="dialog__actionCopy">
                  <span>{options.extraActionText}</span>
                  {options.extraActionDescription ? (
                    <span className="dialog__actionDescription">
                      {options.extraActionDescription}
                    </span>
                  ) : null}
                </span>
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
              disabled={
                (isPrompt && !promptValue.trim()) ||
                (isPlayerSelection && !selectedPlayerId)
              }
            >
              {options.confirmText ?? "Confirm"}
            </button>
          </div>
        </form>
      </dialog>
    );
  },
);
