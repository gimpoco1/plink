import { AlertTriangle, Check, Eye, EyeOff, Mail } from "lucide-react";
import { formatPlayerName } from "../../utils/text";
import { useAuthDialogContext } from "./AuthDialogContext";

function GoogleBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.88c2.27-2.09 3.55-5.18 3.55-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.95H1.26v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.26a12 12 0 0 0 0 10.74l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09c.95-2.84 3.6-4.95 6.73-4.95Z"
      />
    </svg>
  );
}

export function AuthSignedOutPanel() {
  const {
    accountName,
    busy,
    email,
    error,
    isAwaitingSignupConfirmation,
    mode,
    notice,
    openEmailApp,
    password,
    sendPasswordReset,
    setEmail,
    setAccountName,
    setError,
    setMode,
    setNotice,
    setPassword,
    setShowPassword,
    setSignupConfirmationEmail,
    showPassword,
    signInWithProvider,
    signupConfirmationEmail,
    submit,
  } = useAuthDialogContext();
  return (
    <>
      <div className="authDialog__switch">
        <button
          className={`authDialog__switchBtn${mode === "signin" ? " authDialog__switchBtn--active" : ""}`}
          type="button"
          onClick={() => {
            setMode("signin");
            setSignupConfirmationEmail(null);
            setNotice(null);
            setError(null);
            setShowPassword(false);
          }}
        >
          Sign in
        </button>
        <button
          className={`authDialog__switchBtn${mode === "signup" ? " authDialog__switchBtn--active" : ""}`}
          type="button"
          onClick={() => {
            setMode("signup");
            setNotice(null);
            setError(null);
            setShowPassword(false);
          }}
        >
          Register
        </button>
      </div>

      <div className="authDialog__panel">
        {isAwaitingSignupConfirmation ? (
          <div className="authDialog__confirmationCard">
            <div className="authDialog__confirmationCopy">
              <strong>
                <span
                  className="authDialog__confirmationIcon"
                  aria-hidden="true"
                >
                  <Check size={18} strokeWidth={2.8} />
                </span>
                <span>Check your inbox</span>
              </strong>
              <p>
                We sent a confirmation link to{" "}
                <span>{signupConfirmationEmail}</span>. Open the email and
                confirm the account before signing in.
              </p>
            </div>
            <div className="authDialog__confirmationActions">
              <button
                className="btn btn--primary btn--wide"
                type="button"
                onClick={openEmailApp}
              >
                <Mail size={16} strokeWidth={2.2} aria-hidden="true" />
                <div style={{ marginLeft: "8px" }}>Open email app</div>
              </button>
              <button
                className="btn btn--ghost btn--wide"
                type="button"
                onClick={() => {
                  setSignupConfirmationEmail(null);
                  setNotice(null);
                  setError(null);
                }}
              >
                Use another email
              </button>
            </div>
          </div>
        ) : (
          <>
            {mode === "signup" ? (
              <label className="authField">
                <span>Name</span>
                <input
                  className="input"
                  type="text"
                  autoComplete="name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
            ) : null}

            <label className="authField">
              <span>Email</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="authField">
              <span>Password</span>
              <div className="authDialog__passwordField">
                <input
                  className="input authDialog__passwordInput"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />
                <button
                  className="authDialog__passwordToggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={17} strokeWidth={2.1} />
                  ) : (
                    <Eye size={17} strokeWidth={2.1} />
                  )}
                </button>
              </div>
            </label>

            {mode === "signin" ? (
              <button
                className="authDialog__forgotPassword"
                type="button"
                onClick={() => void sendPasswordReset()}
                disabled={busy || !email.trim()}
              >
                Forgot password?
              </button>
            ) : null}

            {notice ? <div className="authDialog__notice">{notice}</div> : null}
            {error ? (
              <div
                className="authDialog__authAlert authDialog__authAlert--error"
                role="alert"
                aria-live="assertive"
              >
                <span className="authDialog__authAlertIcon" aria-hidden="true">
                  <AlertTriangle size={16} strokeWidth={2.4} />
                </span>
                <span>{error}</span>
              </div>
            ) : null}

            <button
              className="btn btn--primary btn--wide"
              type="button"
              onClick={submit}
              disabled={
                busy ||
                !email.trim() ||
                !password ||
                (mode === "signup" && !formatPlayerName(accountName))
              }
            >
              {busy
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>

            <div className="authDialog__divider" aria-hidden="true">
              <span>
                {mode === "signin" ? "or continue with" : "or register with"}
              </span>
            </div>

            <div
              className="authDialog__providerRow"
              aria-label="Social sign-in options"
            >
              <button
                className="authDialog__providerIconBtn"
                type="button"
                onClick={() => void signInWithProvider("google")}
                disabled={busy}
                aria-label={
                  busy ? "Connecting to Google" : "Continue with Google"
                }
                title="Continue with Google"
              >
                <span
                  className="authDialog__providerIcon authDialog__providerIcon--google"
                  aria-hidden="true"
                >
                  <GoogleBrandIcon />
                </span>
              </button>
              {/*
              <button
                className="authDialog__providerIconBtn"
                type="button"
                onClick={() => void signInWithProvider("apple")}
                disabled={busy}
                aria-label={
                  busy ? "Connecting to iCloud" : "Continue with iCloud"
                }
                title="Continue with iCloud"
              >
                <span
                  className="authDialog__providerIcon authDialog__providerIcon--apple"
                  aria-hidden="true"
                >
                  <AppleBrandIcon />
                </span>
              </button>
              */}
            </div>
          </>
        )}
        <div className="authDialog__links" aria-label="Account links">
          <a href="/privacy.html">Privacy</a>
          <span aria-hidden="true">·</span>
          <a href="/support.html">Support</a>
        </div>
      </div>
    </>
  );
}
