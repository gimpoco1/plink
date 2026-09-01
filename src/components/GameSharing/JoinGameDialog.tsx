import { translate } from "../../i18n/translate";
import { useRef, useState } from "react";
import { AlertTriangle, Link } from "lucide-react";
import "./GameSharing.css";

type Props = {
  onJoin: (code: string) => Promise<void>;
};

const INVITE_CODE_PATTERN = /^(?:[A-Z]{2}\d{2}|[A-F0-9]{8})$/;

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return translate("copy.couldNotJoinThatGameCheckTheCodeAndTryAgain");
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
    if (!INVITE_CODE_PATTERN.test(code) || loading) return;
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
          {translate("copy.haveAnInvitationCode")}
        </span>
        <span className="homeJoinGameButton__action">
          <Link size={16} strokeWidth={2.3} aria-hidden="true" />
          {translate("copy.joinAGame")}
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
              <div className="dialog__eyebrow">
                {translate("copy.sharedGame")}
              </div>
              <div className="dialog__title">
                {translate("copy.joinAGame")}
              </div>
            </div>
            <button
              className="iconbtn"
              type="button"
              onClick={close}
              aria-label={translate("copy.close")}
            >
              ×
            </button>
          </div>

          <div className="gameSharingDialog__body_homeScreen">
            <label
              className="gameSharingDialog__label"
              htmlFor="join-game-code"
            >
              {translate("copy.invitationCode")}
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
                placeholder="AB12"
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
              {translate("copy.yourAccountPlayerWillBeAddedToTheGameAutomatically")}
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
              {translate("copy.cancel")}
            </button>
            <button
              className="btn btn--primary"
              type="submit"
              disabled={!INVITE_CODE_PATTERN.test(code) || loading}
            >
              {loading ? translate("copy.joining") : translate("copy.joinGame")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
