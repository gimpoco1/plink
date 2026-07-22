import { useRef, useState } from "react";
import { AlertTriangle, Link } from "lucide-react";
import "./GameSharing.css";

type Props = {
  onJoin: (code: string) => Promise<void>;
};

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Could not join that game. Check the code and try again.";
}

export function JoinGameDialog({ onJoin }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function close() {
    dialogRef.current?.close();
    setError("");
  }

  async function submit() {
    if (code.length !== 8 || loading) return;
    setLoading(true);
    setError("");
    try {
      await onJoin(code);
      close();
      setCode("");
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="homeJoinGameButton"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className="homeJoinGameButton__prompt">
          Have an invitation code?
        </span>
        <span className="homeJoinGameButton__action">
          <Link size={16} strokeWidth={2.3} aria-hidden="true" />
          Join a game
        </span>
      </button>
      <dialog
        ref={dialogRef}
        className="dialog gameSharingDialog"
        onClose={() => setError("")}
      >
        <form
          className="dialog__form gameSharingDialog__form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="dialog__head">
            <div className="dialog__titleWrap">
              <div className="dialog__eyebrow">Shared game</div>
              <div className="dialog__title">Join a game</div>
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

          <div className="gameSharingDialog__body_homeScreen">
            <label
              className="gameSharingDialog__label"
              htmlFor="join-game-code"
            >
              Invitation code
            </label>
            <div className="gameSharingDialog__inputWrap">
              <Link size={20} strokeWidth={2.2} aria-hidden="true" />
              <input
                id="join-game-code"
                className="input gameSharingDialog__input"
                value={code}
                maxLength={8}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="AB12CD34"
                onChange={(event) => {
                  setCode(
                    event.target.value
                      .replace(/[^a-z0-9]/gi, "")
                      .toUpperCase()
                      .slice(0, 8),
                  );
                  setError("");
                }}
              />
            </div>
            <p className="gameSharingDialog__hint">
              Your account player will be added to the game automatically.
            </p>
            {error ? (
              <div
                className="gameSharingDialog__error"
                role="alert"
                aria-live="assertive"
              >
                <span
                  className="gameSharingDialog__errorIcon"
                  aria-hidden="true"
                >
                  <AlertTriangle size={16} strokeWidth={2.4} />
                </span>
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <div className="dialog__actions">
            <button className="btn btn--ghost" type="button" onClick={close}>
              Cancel
            </button>
            <button
              className="btn btn--primary"
              type="submit"
              disabled={code.length !== 8 || loading}
            >
              {loading ? "Joining…" : "Join game"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
