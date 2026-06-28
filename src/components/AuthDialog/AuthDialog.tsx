import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import "./AuthDialog.css";
import { hasSupabaseConfig, supabase } from "../../lib/supabase";
import type { BackupSelection } from "../../storage/backupFile";
import type { Game, PlayerProfile } from "../../types";

export type AuthDialogHandle = {
  open: () => void;
  close: () => void;
};

type Props = {
  session: Session | null;
  onOpenChange?: (open: boolean) => void;
  localGamesCount?: number;
  localProfilesCount?: number;
  localGames?: Game[];
  localProfiles?: PlayerProfile[];
  accountGamesCount?: number;
  accountProfilesCount?: number;
  accountGames?: Game[];
  accountProfiles?: PlayerProfile[];
  onImportLocalData?: (selection: {
    gameIds: string[];
    profileIds: string[];
  }) =>
    | Promise<{ games: number; profiles: number }>
    | { games: number; profiles: number };
  onImportBackupFile?: (
    file: File,
    selection: BackupSelection,
  ) =>
    | Promise<{ games: number; profiles: number }>
    | { games: number; profiles: number };
  onDownloadBackupFile?: (
    selection: BackupSelection,
  ) =>
    | Promise<{ games: number; profiles: number }>
    | { games: number; profiles: number };
};

export const AuthDialog = forwardRef<AuthDialogHandle, Props>(
  function AuthDialog(
    {
      session,
      onOpenChange,
      localGamesCount = 0,
      localProfilesCount = 0,
      localGames = [],
      localProfiles = [],
      accountGamesCount = 0,
      accountProfilesCount = 0,
      accountGames = [],
      accountProfiles = [],
      onImportLocalData,
      onImportBackupFile,
      onDownloadBackupFile,
    },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const backupInputRef = useRef<HTMLInputElement | null>(null);
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [showTransferTools, setShowTransferTools] = useState(false);
    const [showDeviceImport, setShowDeviceImport] = useState(false);
    const [showAccountDetails, setShowAccountDetails] = useState(false);
    const [includeGames, setIncludeGames] = useState(true);
    const [includeProfiles, setIncludeProfiles] = useState(true);
    const [selectedLocalGameIds, setSelectedLocalGameIds] = useState<string[]>(
      () => localGames.map((game) => game.id),
    );
    const [selectedLocalProfileIds, setSelectedLocalProfileIds] = useState<
      string[]
    >(() => localProfiles.map((profile) => profile.id));
    const hasLocalData = localGamesCount > 0 || localProfilesCount > 0;
    const hasSelectedLocalData =
      selectedLocalGameIds.length > 0 || selectedLocalProfileIds.length > 0;
    const transferSelection: BackupSelection = {
      games: includeGames,
      profiles: includeProfiles,
    };

    useImperativeHandle(
      ref,
      () => ({
        open() {
          setNotice(null);
          setError(null);
          setShowTransferTools(false);
          setShowDeviceImport(false);
          setShowAccountDetails(false);
          setSelectedLocalGameIds(localGames.map((game) => game.id));
          setSelectedLocalProfileIds(
            localProfiles.map((profile) => profile.id),
          );
          if (!dialogRef.current?.open) {
            onOpenChange?.(true);
            dialogRef.current?.showModal();
          }
        },
        close() {
          if (dialogRef.current?.open) {
            onOpenChange?.(false);
            dialogRef.current.close();
          }
        },
      }),
      [localGames, localProfiles, onOpenChange],
    );

    function toggleLocalGame(gameId: string) {
      setSelectedLocalGameIds((current) =>
        current.includes(gameId)
          ? current.filter((id) => id !== gameId)
          : [...current, gameId],
      );
    }

    function toggleLocalProfile(profileId: string) {
      setSelectedLocalProfileIds((current) =>
        current.includes(profileId)
          ? current.filter((id) => id !== profileId)
          : [...current, profileId],
      );
    }

    async function submit() {
      if (!supabase) {
        setError("Supabase is not configured yet.");
        return;
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) return;

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        if (mode === "signin") {
          const { error: signInError } = await supabase.auth.signInWithPassword(
            {
              email: trimmedEmail,
              password,
            },
          );
          if (signInError) throw signInError;
          if (dialogRef.current?.open) {
            onOpenChange?.(false);
            dialogRef.current.close();
          }
        } else {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
          });
          if (signUpError) throw signUpError;
          if (!data.session) {
            setNotice(
              "Check your inbox to confirm the account before signing in.",
            );
          } else {
            if (dialogRef.current?.open) {
              onOpenChange?.(false);
              dialogRef.current.close();
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
      } finally {
        setBusy(false);
      }
    }

    async function signOut() {
      if (!supabase) return;
      setBusy(true);
      setError(null);
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        if (dialogRef.current?.open) {
          onOpenChange?.(false);
          dialogRef.current.close();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign out failed.");
      } finally {
        setBusy(false);
      }
    }

    function formatTransferParts(result: { games: number; profiles: number }) {
      return [
        result.games
          ? `${result.games} session${result.games === 1 ? "" : "s"}`
          : "",
        result.profiles
          ? `${result.profiles} player${result.profiles === 1 ? "" : "s"}`
          : "",
      ].filter(Boolean);
    }

    async function runImportFromDevice() {
      if (!hasSelectedLocalData) {
        setError("Select at least one session or player to import.");
        return;
      }

      if (!onImportLocalData) return;

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        const result = await onImportLocalData({
          gameIds: selectedLocalGameIds,
          profileIds: selectedLocalProfileIds,
        });
        const parts = formatTransferParts(result);

        if (parts.length === 0) {
          setNotice("Nothing new to import from this device.");
          return;
        }

        setNotice(`Imported ${parts.join(" and ")} to your account.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed.");
      } finally {
        setBusy(false);
      }
    }

    async function runImportFromFile(file: File) {
      if (!includeGames && !includeProfiles) {
        setError("Select games, players, or both first.");
        return;
      }
      if (!onImportBackupFile) return;

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        const result = await onImportBackupFile(file, transferSelection);
        const parts = formatTransferParts(result);

        if (parts.length === 0) {
          setNotice(
            "No new sessions or players were found in that backup file.",
          );
          return;
        }

        setNotice(`Imported ${parts.join(" and ")} from backup file.`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Import from file failed.",
        );
      } finally {
        setBusy(false);
        if (backupInputRef.current) backupInputRef.current.value = "";
      }
    }

    async function runDownloadBackupFile() {
      if (!includeGames && !includeProfiles) {
        setError("Select games, players, or both first.");
        return;
      }
      if (!onDownloadBackupFile) return;

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        const result = await onDownloadBackupFile(transferSelection);
        const parts = formatTransferParts(result);
        setNotice(
          parts.length > 0
            ? `Downloaded backup file with ${parts.join(" and ")}.`
            : "Downloaded an empty backup file.",
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Backup download failed.",
        );
      } finally {
        setBusy(false);
      }
    }

    return (
      <dialog
        className="dialog authDialog"
        ref={dialogRef}
        onClose={() => {
          onOpenChange?.(false);
          setNotice(null);
          setError(null);
        }}
      >
        <div className="dialog__form authDialog__form">
          <div className="dialog__head">
            <div className="authDialog__headCopy dialog__titleWrap">
              <div className="dialog__eyebrow">Profile and sync</div>
              <div className="dialog__title">Account</div>
            </div>
            <button
              className="iconbtn"
              type="button"
              onClick={() => {
                onOpenChange?.(false);
                dialogRef.current?.close();
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {!hasSupabaseConfig ? (
            <div className="authDialog__panel">
              <p className="authDialog__text">
                Configure <code>VITE_SUPABASE_URL</code> and{" "}
                <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to enable login and
                cloud sync.
              </p>
            </div>
          ) : session ? (
            <div className="authDialog__panel">
              {session.user.email ? (
                <div
                  className="authDialog__accountIdentity"
                  aria-label="Signed in account"
                >
                  <span className="authDialog__accountIdentityLabel">
                    Signed in as
                  </span>
                  <span className="authDialog__accountEmail">
                    {session.user.email}
                  </span>
                </div>
              ) : null}
              <div className="authDialog__storage">
                <div
                  className={`authDialog__storageCard${showAccountDetails ? "" : " authDialog__storageCard--collapsed"}`}
                >
                  <button
                    type="button"
                    className="authDialog__storageToggle"
                    onClick={() => setShowAccountDetails((value) => !value)}
                    aria-expanded={showAccountDetails}
                    aria-controls="auth-account-details"
                  >
                    <span className="authDialog__storageLabel">Details</span>
                    <span
                      className={`authDialog__storageChevron${showAccountDetails ? " authDialog__storageChevron--open" : ""}`}
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        focusable="false"
                        aria-hidden="true"
                      >
                        <path
                          d="M5.5 7.5 10 12.5l4.5-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  <div className="authDialog__storageStats">
                    <strong>{accountGamesCount}</strong>
                    <span>sessions</span>
                    <strong>{accountProfilesCount}</strong>
                    <span>players</span>
                  </div>
                  {showAccountDetails ? (
                    <div
                      className="authDialog__accountDetails"
                      id="auth-account-details"
                    >
                      <section className="authDialog__accountGroup">
                        <div className="authDialog__accountGroupTitle">
                          Sessions
                        </div>
                        {accountGames.length > 0 ? (
                          <ul className="authDialog__accountList">
                            {accountGames.slice(0, 5).map((game) => (
                              <li
                                key={game.id}
                                className="authDialog__accountItem"
                              >
                                <strong>{game.name}</strong>
                                <span>
                                  {game.players.length} player
                                  {game.players.length === 1 ? "" : "s"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : accountGamesCount > 0 ? (
                          <div className="authDialog__accountMore">
                            {accountGamesCount} saved session
                            {accountGamesCount === 1 ? "" : "s"} in your
                            account. List will appear after sync refresh.
                          </div>
                        ) : (
                          <div className="authDialog__accountEmpty">
                            No saved sessions yet.
                          </div>
                        )}
                        {accountGames.length > 5 ? (
                          <div className="authDialog__accountMore">
                            +{accountGames.length - 5} more session
                            {accountGames.length - 5 === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </section>

                      <section className="authDialog__accountGroup">
                        <div className="authDialog__accountGroupTitle">
                          Players
                        </div>
                        {accountProfiles.length > 0 ? (
                          <ul className="authDialog__accountList">
                            {accountProfiles.slice(0, 6).map((profile) => (
                              <li
                                key={profile.id}
                                className="authDialog__accountItem"
                              >
                                <strong>{profile.name}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : accountProfilesCount > 0 ? (
                          <div className="authDialog__accountMore">
                            {accountProfilesCount} saved player
                            {accountProfilesCount === 1 ? "" : "s"} in your
                            account. List will appear after sync refresh.
                          </div>
                        ) : (
                          <div className="authDialog__accountEmpty">
                            No saved players yet.
                          </div>
                        )}
                        {accountProfiles.length > 6 ? (
                          <div className="authDialog__accountMore">
                            +{accountProfiles.length - 6} more player
                            {accountProfiles.length - 6 === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </section>
                    </div>
                  ) : null}
                </div>
              </div>
              <button
                className="btn btn--ghost btn--wide authDialog__toggleTransfer"
                type="button"
                onClick={() => setShowTransferTools((value) => !value)}
              >
                {showTransferTools ? "Hide data tools" : "Move or back up data"}
              </button>
              {showTransferTools ? (
                <div className="authDialog__transfer">
                  <div className="authDialog__transferHead">
                    <div className="authDialog__label">Data tools</div>
                    <p className="authDialog__text">
                      Import guest-mode data from this browser, import from a
                      backup file, or download a backup.
                    </p>
                  </div>
                  <div className="authDialog__transferBlock">
                    <div className="authDialog__transferTitle">
                      Import into account
                    </div>
                    <div className="authDialog__transferActions">
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => setShowDeviceImport((value) => !value)}
                        disabled={busy || !hasLocalData}
                      >
                        {showDeviceImport
                          ? "Hide device items"
                          : "From guest sessions"}
                      </button>
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => backupInputRef.current?.click()}
                        disabled={busy}
                      >
                        From backup file
                      </button>
                    </div>
                    {showDeviceImport && hasLocalData ? (
                      <div className="authDialog__deviceImport">
                        {localGames.length > 0 ? (
                          <div className="authDialog__deviceGroup">
                            <div className="authDialog__deviceGroupTitle">
                              Guest sessions on this device
                            </div>
                            <div className="authDialog__deviceList">
                              {localGames.map((game) => (
                                <label
                                  key={game.id}
                                  className="authDialog__deviceItem"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedLocalGameIds.includes(
                                      game.id,
                                    )}
                                    onChange={() => toggleLocalGame(game.id)}
                                  />
                                  <span>
                                    <strong>{game.name}</strong>
                                    <em>{game.players.length} players</em>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {localProfiles.length > 0 ? (
                          <div className="authDialog__deviceGroup">
                            <div className="authDialog__deviceGroupTitle">
                              Guest players on this device
                            </div>
                            <div className="authDialog__deviceList">
                              {localProfiles.map((profile) => (
                                <label
                                  key={profile.id}
                                  className="authDialog__deviceItem"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedLocalProfileIds.includes(
                                      profile.id,
                                    )}
                                    onChange={() =>
                                      toggleLocalProfile(profile.id)
                                    }
                                  />
                                  <span>
                                    <strong>{profile.name}</strong>
                                    <em>Player profile</em>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <button
                          className="btn btn--ghost"
                          type="button"
                          onClick={() => void runImportFromDevice()}
                          disabled={busy || !hasSelectedLocalData}
                        >
                          {busy ? "Working..." : "Import selected items"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="authDialog__transferBlock">
                    <div className="authDialog__transferTitle">
                      Backup this account
                    </div>
                    <div className="authDialog__checks">
                      <label className="authDialog__check">
                        <input
                          type="checkbox"
                          checked={includeGames}
                          onChange={(e) => setIncludeGames(e.target.checked)}
                        />
                        <span>Sessions</span>
                      </label>
                      <label className="authDialog__check">
                        <input
                          type="checkbox"
                          checked={includeProfiles}
                          onChange={(e) => setIncludeProfiles(e.target.checked)}
                        />
                        <span>Players</span>
                      </label>
                    </div>
                    <div className="authDialog__transferActions">
                      <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => void runDownloadBackupFile()}
                        disabled={busy}
                      >
                        {busy ? "Working..." : "Download backup file"}
                      </button>
                    </div>
                  </div>
                  <input
                    ref={backupInputRef}
                    className="authDialog__fileInput"
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void runImportFromFile(file);
                    }}
                  />
                </div>
              ) : null}
              {notice ? (
                <div className="authDialog__notice">{notice}</div>
              ) : null}
              {error ? <div className="authDialog__error">{error}</div> : null}
              <button
                className="btn btn--primary btn--wide"
                type="button"
                onClick={signOut}
                disabled={busy}
              >
                {busy ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : (
            <>
              <div className="authDialog__switch">
                <button
                  className={`authDialog__switchBtn${mode === "signin" ? " authDialog__switchBtn--active" : ""}`}
                  type="button"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
                <button
                  className={`authDialog__switchBtn${mode === "signup" ? " authDialog__switchBtn--active" : ""}`}
                  type="button"
                  onClick={() => setMode("signup")}
                >
                  Register
                </button>
              </div>

              <div className="authDialog__panel">
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
                  <input
                    className="input"
                    type="password"
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
                </label>

                {notice ? (
                  <div className="authDialog__notice">{notice}</div>
                ) : null}
                {error ? (
                  <div className="authDialog__error">{error}</div>
                ) : null}

                <button
                  className="btn btn--primary btn--wide"
                  type="button"
                  onClick={submit}
                  disabled={busy || !email.trim() || !password}
                >
                  {busy
                    ? mode === "signin"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "signin"
                      ? "Sign in"
                      : "Create account"}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    );
  },
);
