import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthPasswordRecoveryPanel() {
  const {
    busy,
    confirmNewPassword,
    error,
    newPassword,
    notice,
    setConfirmNewPassword,
    setNewPassword,
    submitNewPassword,
  } = useAuthDialogContext();
  return (
    <div className="authDialog__panel">
      <label className="authField">
        <span>New password</span>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="••••••••"
        />
      </label>
      <label className="authField">
        <span>Confirm password</span>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirmNewPassword}
          onChange={(event) => setConfirmNewPassword(event.target.value)}
          placeholder="••••••••"
          onKeyDown={(event) => {
            if (event.key === "Enter") void submitNewPassword();
          }}
        />
      </label>
      {notice ? <div className="authDialog__notice">{notice}</div> : null}
      {error ? <div className="authDialog__error">{error}</div> : null}
      <button
        className="btn btn--primary btn--wide"
        type="button"
        onClick={() => void submitNewPassword()}
        disabled={busy || !newPassword || !confirmNewPassword}
      >
        {busy ? "Updating..." : "Update password"}
      </button>
    </div>
  );
}
