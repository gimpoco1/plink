import { translate } from "../../i18n/translate";
import { Check, Eye, EyeOff, Mail } from "lucide-react";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { formatPlayerName } from "../../utils/text";
import { useAuthDialogContext } from "./AuthDialogContext";

export function AuthSignedOutPanel() {
  const {
    accountName,
    busy,
    email,
    isAwaitingSignupConfirmation,
    mode,
    oauthProvider,
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
          {translate("topbar.signIn")}
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
          {translate("copy.register")}
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
                <span>{translate("copy.checkYourInbox")}</span>
              </strong>
              <p>
                {translate("copy.weSentAConfirmationLinkTo")}{" "}
                <span>{signupConfirmationEmail}</span>{translate("copy.openTheEmailAndConfirmTheAccountBeforeSigningIn")}
              </p>
            </div>
            <div className="authDialog__confirmationActions">
              <button
                className="btn btn--primary btn--wide"
                type="button"
                onClick={openEmailApp}
              >
                <Mail size={16} strokeWidth={2.2} aria-hidden="true" />
                <div style={{ marginLeft: "8px" }}>
                  {translate("copy.openEmailApp")}
                </div>
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
                {translate("copy.useAnotherEmail")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {mode === "signup" ? (
              <label className="authField">
                <span>{translate("copy.name")}</span>
                <input
                  className="input"
                  type="text"
                  autoComplete="name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={translate("copy.yourName")}
                />
              </label>
            ) : null}

            <label className="authField">
              <span>{translate("copy.email")}</span>
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
              <span>{translate("copy.password")}</span>
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
                  aria-label={showPassword ? translate("copy.hidePassword") : translate("copy.showPassword")}
                  title={showPassword ? translate("copy.hidePassword") : translate("copy.showPassword")}
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
                {translate("copy.forgotPassword")}
              </button>
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
              {busy && !oauthProvider
                ? mode === "signin"
                  ? translate("copy.signingIn")
                  : translate("copy.creatingAccount")
                : mode === "signin"
                  ? translate("topbar.signIn")
                  : translate("copy.createAccount")}
            </button>

            <div className="authDialog__divider" aria-hidden="true">
              <span>
                {mode === "signin"
                  ? translate("copy.orContinueWith")
                  : translate("copy.orRegisterWith")}
              </span>
            </div>

            <div
              className="authDialog__providerRow"
              aria-label={translate("copy.socialSignInOptions")}
            >
              <button
                className="authDialog__providerBtn"
                type="button"
                onClick={() => void signInWithProvider("google")}
                disabled={busy}
                aria-label={
                  oauthProvider === "google"
                    ? translate("copy.connectingToGoogle")
                    : translate("copy.continueWithGoogle")
                }
                aria-busy={oauthProvider === "google"}
                title={translate("copy.continueWithGoogle")}
              >
                <span
                  className="authDialog__providerIcon authDialog__providerIcon--google"
                  aria-hidden="true"
                >
                  <FcGoogle />
                </span>
              </button>
              <button
                className="authDialog__providerBtn authDialog__providerBtn--apple"
                type="button"
                onClick={() => void signInWithProvider("apple")}
                disabled={busy}
                aria-label={
                  oauthProvider === "apple"
                    ? translate("copy.connectingToApple")
                    : translate("copy.continueWithApple")
                }
                aria-busy={oauthProvider === "apple"}
                title={translate("copy.continueWithApple")}
              >
                <span
                  className="authDialog__providerIcon authDialog__providerIcon--apple"
                  aria-hidden="true"
                >
                  <FaApple />
                </span>
              </button>
            </div>
          </>
        )}
        <div
          className="authDialog__links"
          aria-label={translate("copy.accountLinks")}
        >
          <a href="/privacy.html">{translate("copy.privacy")}</a>
          <span aria-hidden="true">·</span>
          <a href="/support.html">{translate("copy.support")}</a>
        </div>
      </div>
    </>
  );
}
