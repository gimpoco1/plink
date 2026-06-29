import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import "./AuthDialog.css";
import { AVATAR_COLORS } from "../../constants";
import { hasSupabaseConfig, supabase } from "../../lib/supabase";
import type { BackupSelection } from "../../storage/backupFile";
import type { Game, PlayerProfile } from "../../types";
import { avatarStyleFor } from "../../utils/color";
import {
  formatAccountPlayerName,
  formatPlayerName,
  getInitials,
} from "../../utils/text";

export type AuthDialogHandle = {
  open: () => void;
  openPasswordReset: () => void;
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
  onUpdateProfile?: (
    id: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
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
      onUpdateProfile,
      onImportLocalData,
      onImportBackupFile,
      onDownloadBackupFile,
    },
    ref,
  ) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const backupInputRef = useRef<HTMLInputElement | null>(null);
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [recoveryMode, setRecoveryMode] = useState(false);
    const [accountName, setAccountName] = useState("");
    const [accountDraftName, setAccountDraftName] = useState("");
    const [accountDraftColor, setAccountDraftColor] = useState("");
    const [editingAccountPlayer, setEditingAccountPlayer] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
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
    const accountPlayer =
      accountProfiles.find((profile) => profile.isAccountPlayer) ?? null;
    const accountPlayerName = accountPlayer?.name ?? "";
    const accountPlayerColor =
      accountPlayer?.avatarColor ?? AVATAR_COLORS[0]?.value ?? "#64748b";

    useImperativeHandle(
      ref,
      () => ({
        open() {
          setNotice(null);
          setError(null);
          setRecoveryMode(false);
          setNewPassword("");
          setConfirmNewPassword("");
          setShowTransferTools(false);
          setShowDeviceImport(false);
          setShowAccountDetails(false);
          setEditingAccountPlayer(false);
          setAccountDraftName(accountPlayerName);
          setAccountDraftColor(accountPlayerColor);
          setSelectedLocalGameIds(localGames.map((game) => game.id));
          setSelectedLocalProfileIds(
            localProfiles.map((profile) => profile.id),
          );
          if (!dialogRef.current?.open) {
            onOpenChange?.(true);
            dialogRef.current?.showModal();
          }
        },
        openPasswordReset() {
          setMode("signin");
          setRecoveryMode(true);
          setNotice("Enter a new password for your account.");
          setError(null);
          setPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
          setShowTransferTools(false);
          setShowDeviceImport(false);
          setShowAccountDetails(false);
          setEditingAccountPlayer(false);
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
      [
        accountPlayerColor,
        accountPlayerName,
        localGames,
        localProfiles,
        onOpenChange,
      ],
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

    function getAuthErrorMessage(err: unknown, fallback: string) {
      const message = err instanceof Error ? err.message : "";
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: unknown }).status)
          : null;

      if (status === 429 || message.toLowerCase().includes("rate limit")) {
        return "Too many auth emails were requested. Wait before trying again, or configure custom SMTP in Supabase for higher email limits.";
      }

      return message || fallback;
    }

    async function submit() {
      if (!supabase) {
        setError("Supabase is not configured yet.");
        return;
      }

      const trimmedEmail = email.trim();
      const trimmedAccountName = formatPlayerName(accountName);
      if (!trimmedEmail || !password) return;
      if (mode === "signup" && !trimmedAccountName) {
        setError("Enter your player name.");
        return;
      }

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
            options: {
              data: {
                name: trimmedAccountName,
                full_name: trimmedAccountName,
                display_name: trimmedAccountName,
                player_name: trimmedAccountName,
              },
            },
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
        setError(getAuthErrorMessage(err, "Authentication failed."));
      } finally {
        setBusy(false);
      }
    }

    async function sendPasswordReset() {
      if (!supabase) {
        setError("Supabase is not configured yet.");
        return;
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError("Enter your email first.");
        return;
      }

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(trimmedEmail, {
            redirectTo,
          });
        if (resetError) throw resetError;
        setNotice("Check your email for a password reset link.");
      } catch (err) {
        setError(getAuthErrorMessage(err, "Could not send reset link."));
      } finally {
        setBusy(false);
      }
    }

    async function submitNewPassword() {
      if (!supabase) {
        setError("Supabase is not configured yet.");
        return;
      }

      if (newPassword.length < 6) {
        setError("Enter a password with at least 6 characters.");
        return;
      }

      if (newPassword !== confirmNewPassword) {
        setError("Passwords do not match.");
        return;
      }

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) throw updateError;
        setNewPassword("");
        setConfirmNewPassword("");
        setRecoveryMode(false);
        setNotice("Password updated.");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not update password.",
        );
      } finally {
        setBusy(false);
      }
    }

    async function saveAccountPlayerName() {
      const name = formatPlayerName(accountDraftName);
      if (!name || !accountPlayer || !onUpdateProfile) return;
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const { error: updateError } = await supabase?.auth.updateUser({
          data: {
            name,
            full_name: name,
            display_name: name,
            player_name: name,
          },
        }) ?? { error: null };
        if (updateError) throw updateError;
        onUpdateProfile(accountPlayer.id, {
          name,
          avatarColor: accountDraftColor || accountPlayer.avatarColor,
        });
        setAccountDraftName(name);
        setEditingAccountPlayer(false);
        setNotice("Account player updated.");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not update player name.",
        );
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
          setRecoveryMode(false);
        }}
      >
        <div className="dialog__form authDialog__form">
          <div className="dialog__head">
            <div className="authDialog__headCopy dialog__titleWrap">
              <div className="dialog__eyebrow">Profile and sync</div>
              <div className="dialog__title">
                {recoveryMode ? "Reset password" : "Account"}
              </div>
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
          ) : recoveryMode ? (
            <div className="authDialog__panel">
              <label className="authField">
                <span>New password</span>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitNewPassword();
                  }}
                />
              </label>

              {notice ? (
                <div className="authDialog__notice">{notice}</div>
              ) : null}
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
              <section className="authDialog__accountPlayerSection">
                <div className="authDialog__accountPlayerTitle">
                  Account player
                </div>
                <article
                  className={`authDialog__accountPlayerCard${
                    editingAccountPlayer && accountPlayer
                      ? " authDialog__accountPlayerCard--editing"
                      : ""
                  }`}
                >
                  <div className="authDialog__accountPlayerMain">
                    <span
                      className="authDialog__accountPlayerAvatar"
                      style={avatarStyleFor(
                        editingAccountPlayer && accountPlayer
                          ? accountDraftColor || accountPlayer.avatarColor
                          : accountPlayerColor,
                      )}
                      aria-hidden="true"
                    >
                      {getInitials(accountDraftName || accountPlayerName || "Player")}
                    </span>
                    {editingAccountPlayer && accountPlayer ? (
                      <div className="authDialog__accountPlayerEditStack">
                        <div className="authDialog__accountPlayerEditTop">
                          <input
                            className="input input--compact authDialog__accountPlayerInput"
                            type="text"
                            value={accountDraftName}
                            onChange={(event) =>
                              setAccountDraftName(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                void saveAccountPlayerName();
                              }
                              if (event.key === "Escape") {
                                setAccountDraftName(accountPlayer.name);
                                setAccountDraftColor(accountPlayer.avatarColor);
                                setEditingAccountPlayer(false);
                              }
                            }}
                            autoFocus
                            maxLength={28}
                            placeholder="Player name"
                          />
                          <div className="authDialog__accountPlayerActions authDialog__accountPlayerActions--edit">
                            <button
                              className="iconbtn iconbtn--sm iconbtn--primary authDialog__accountPlayerAction"
                              type="button"
                              onClick={() => void saveAccountPlayerName()}
                              disabled={
                                busy || !formatPlayerName(accountDraftName)
                              }
                              aria-label="Save account player"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              className="iconbtn iconbtn--sm authDialog__accountPlayerAction"
                              type="button"
                              onClick={() => {
                                setAccountDraftName(accountPlayer.name);
                                setAccountDraftColor(accountPlayer.avatarColor);
                                setEditingAccountPlayer(false);
                              }}
                              aria-label="Cancel editing account player"
                              title="Cancel"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div
                          className="authDialog__accountPlayerSwatches"
                          role="radiogroup"
                          aria-label="Choose account player color"
                        >
                          {AVATAR_COLORS.map((color) => (
                            <button
                              key={color.id}
                              type="button"
                              className={
                                color.value === accountDraftColor
                                  ? "authDialog__accountPlayerSwatch authDialog__accountPlayerSwatch--selected"
                                  : "authDialog__accountPlayerSwatch"
                              }
                              style={{ backgroundColor: color.value }}
                              onClick={() => setAccountDraftColor(color.value)}
                              aria-label={color.label}
                              aria-checked={color.value === accountDraftColor}
                              role="radio"
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="authDialog__accountPlayerIdentity">
                        <span className="authDialog__accountPlayerName">
                          {accountPlayerName
                            ? formatAccountPlayerName(accountPlayerName)
                            : "Not created yet"}
                        </span>
                        {accountPlayer && onUpdateProfile ? (
                          <div className="authDialog__accountPlayerActions">
                            <button
                              className="iconbtn iconbtn--sm authDialog__accountPlayerAction"
                              type="button"
                              onClick={() => {
                                setAccountDraftName(accountPlayer.name);
                                setAccountDraftColor(accountPlayer.avatarColor);
                                setEditingAccountPlayer(true);
                              }}
                              aria-label="Edit account player"
                              title="Edit"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M4 20h4.2L18.6 9.6a1.6 1.6 0 0 0 0-2.2l-2-2a1.6 1.6 0 0 0-2.2 0L4 15.8V20Z"
                                  stroke="currentColor"
                                  strokeWidth="1.9"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </article>
              </section>
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
                                <strong>
                                  {profile.isAccountPlayer
                                    ? formatAccountPlayerName(profile.name)
                                    : profile.name}
                                </strong>
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
              </div>
            </>
          )}
        </div>
      </dialog>
    );
  },
);
