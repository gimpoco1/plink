import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { clampName } from "../utils/text";

export type AddPlayerDialogHandle = {
  open: () => void;
  close: () => void;
};

type Props = {
  onAdd: (name: string) => boolean;
};

export const AddPlayerDialog = forwardRef<AddPlayerDialogHandle, Props>(function AddPlayerDialog(
  { onAdd },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingName, setPendingName] = useState("");

  function open() {
    setPendingName("");
    dialogRef.current?.showModal();
    queueMicrotask(() => nameInputRef.current?.focus());
  }

  function close() {
    dialogRef.current?.close();
  }

  useImperativeHandle(ref, () => ({ open, close }), []);

  function submit() {
    const name = clampName(pendingName);
    if (!name) return;
    const ok = onAdd(name);
    if (ok) close();
  }

  return (
    <dialog className="dialog" ref={dialogRef} onClose={() => setPendingName("")}>
      <form
        method="dialog"
        className="dialog__form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="dialog__head">
          <div className="dialog__title">Add player</div>
          <button className="iconbtn" type="button" onClick={close} aria-label="Close">
            ×
          </button>
        </div>

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
          />
        </label>

        <div className="dialog__actions">
          <button className="btn btn--ghost" type="button" onClick={close}>
            Cancel
          </button>
          <button className="btn btn--primary" type="submit" disabled={!clampName(pendingName)}>
            Add
          </button>
        </div>
      </form>
    </dialog>
  );
});

