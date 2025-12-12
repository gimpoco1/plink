import { forwardRef, useImperativeHandle, useRef, useState } from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
};

export type ConfirmDialogHandle = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

export const ConfirmDialog = forwardRef<ConfirmDialogHandle>(function ConfirmDialog(_, ref) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    tone: "default",
  });

  function closeWith(value: boolean) {
    dialogRef.current?.close();
    resolverRef.current?.(value);
    resolverRef.current = null;
  }

  useImperativeHandle(
    ref,
    () => ({
      confirm: (next) => {
        setOptions({
          title: next.title,
          message: next.message,
          confirmText: next.confirmText ?? "Confirm",
          cancelText: next.cancelText ?? "Cancel",
          tone: next.tone ?? "default",
        });
        dialogRef.current?.showModal();
        return new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
        });
      },
    }),
    [],
  );

  return (
    <dialog
      className="dialog"
      ref={dialogRef}
      onClose={() => {
        if (resolverRef.current) closeWith(false);
      }}
    >
      <form
        method="dialog"
        className="dialog__form"
        onSubmit={(e) => {
          e.preventDefault();
          closeWith(true);
        }}
      >
        <div className="dialog__head">
          <div className="dialog__title">{options.title}</div>
          <button className="iconbtn" type="button" onClick={() => closeWith(false)} aria-label="Close">
            ×
          </button>
        </div>

        <div className="dialog__body">
          <p className="dialog__message">{options.message}</p>
        </div>

        <div className="dialog__actions">
          <button className="btn btn--ghost" type="button" onClick={() => closeWith(false)}>
            {options.cancelText ?? "Cancel"}
          </button>
          <button
            className={options.tone === "danger" ? "btn btn--dangerSolid" : "btn btn--primary"}
            type="submit"
          >
            {options.confirmText ?? "Confirm"}
          </button>
        </div>
      </form>
    </dialog>
  );
});

