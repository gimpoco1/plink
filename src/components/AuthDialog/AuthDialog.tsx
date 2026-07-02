import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Check,
  ChevronDown,
  Crown,
  Download,
  FileUp,
  LogOut,
  Pencil,
  Plus,
} from "lucide-react";
import "./AuthDialog.css";
import { AVATAR_COLORS } from "../../constants";
import { useEntitlementsContext } from "../../hooks/useEntitlements";
import { hasSupabaseConfig, supabase } from "../../lib/supabase";
import type { BackupSelection } from "../../storage/backupFile";
import type { Game, PlayerProfile, ToastState, ToastTone } from "../../types";
import { avatarStyleFor } from "../../utils/color";
import {
  formatAccountPlayerName,
  formatPlayerName,
  getInitials,
} from "../../utils/text";

export type AuthDialogHandle = {
  open: () => void;
  openPlan: () => void;
  openLocalImport: () => void;
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
    const {
      source,
      isPro,
      shouldShowAds,
      canUseTeams,
      canSeeAdvancedStats,
      maxSessions,
    } = useEntitlementsContext();
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const backupInputRef = useRef<HTMLInputElement | null>(null);
    const deviceImportRef = useRef<HTMLDivElement | null>(null);
    const planSectionRef = useRef<HTMLElement | null>(null);
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
    const [transferToast, setTransferToast] = useState<ToastState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [showTransferTools, setShowTransferTools] = useState(false);
    const [showDeviceImport, setShowDeviceImport] = useState(false);
    const [showAccountDetails, setShowAccountDetails] = useState(false);
    const [showPlanDetails, setShowPlanDetails] = useState(false);
    const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<
      "monthly" | "yearly"
    >("yearly");
    const [localSessionSearch, setLocalSessionSearch] = useState("");
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
    const normalizedLocalSessionSearch = localSessionSearch
      .trim()
      .toLowerCase();
    const filteredLocalGames = useMemo(() => {
      if (!normalizedLocalSessionSearch) return localGames;
      return localGames.filter((game) => {
        const searchable = [
          game.name,
          ...game.players.map((player) => player.name),
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(normalizedLocalSessionSearch);
      });
    }, [localGames, normalizedLocalSessionSearch]);
    const hasFilteredLocalGames = filteredLocalGames.length > 0;
    const allFilteredLocalGamesSelected =
      hasFilteredLocalGames &&
      filteredLocalGames.every((game) =>
        selectedLocalGameIds.includes(game.id),
      );
    const transferSelection: BackupSelection = {
      games: includeGames,
      profiles: includeProfiles,
    };
    const accountPlayer =
      accountProfiles.find((profile) => profile.isAccountPlayer) ?? null;
    const accountPlayerName = accountPlayer?.name ?? "";
    const accountPlayerColor =
      accountPlayer?.avatarColor ?? AVATAR_COLORS[0]?.value ?? "#64748b";
    const proMonthlyUrl = import.meta.env.VITE_PRO_MONTHLY_URL?.trim();
    const proYearlyUrl = import.meta.env.VITE_PRO_YEARLY_URL?.trim();
    const proRestoreUrl = import.meta.env.VITE_PRO_RESTORE_URL?.trim();
    const selectedCheckoutUrl =
      selectedBillingPeriod === "monthly" ? proMonthlyUrl : proYearlyUrl;

    function resetDialogState() {
      setNotice(null);
      setTransferToast(null);
      setError(null);
      setRecoveryMode(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setShowTransferTools(false);
      setShowDeviceImport(false);
      setShowAccountDetails(false);
      setShowPlanDetails(false);
      setSelectedBillingPeriod("yearly");
      setEditingAccountPlayer(false);
      setLocalSessionSearch("");
      setAccountDraftName(accountPlayerName);
      setAccountDraftColor(accountPlayerColor);
      setSelectedLocalGameIds(localGames.map((game) => game.id));
      setSelectedLocalProfileIds(localProfiles.map((profile) => profile.id));
    }

    function showDialog() {
      if (!dialogRef.current?.open) {
        onOpenChange?.(true);
        dialogRef.current?.showModal();
      }
    }

    function scrollToLocalImportSection() {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const dialog = dialogRef.current;
          const target = deviceImportRef.current;
          if (!dialog || !target) return;
          const offset = target.offsetTop - 104;
          dialog.scrollTo({
            top: Math.max(0, offset),
            behavior: "smooth",
          });
        });
      });
    }

    function scrollToPlanSection() {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const dialog = dialogRef.current;
          const target = planSectionRef.current;
          if (!dialog || !target) return;
          const offset = target.offsetTop - 104;
          dialog.scrollTo({
            top: Math.max(0, offset),
            behavior: "smooth",
          });
        });
      });
    }

    useImperativeHandle(
      ref,
      () => ({
        open() {
          resetDialogState();
          showDialog();
        },
        openPlan() {
          resetDialogState();
          setShowPlanDetails(true);
          showDialog();
          scrollToPlanSection();
        },
        openLocalImport() {
          resetDialogState();
          setShowTransferTools(true);
          setShowDeviceImport(true);
          showDialog();
          scrollToLocalImportSection();
        },
        openPasswordReset() {
          setMode("signin");
          setRecoveryMode(true);
          setNotice("Enter a new password for your account.");
          setTransferToast(null);
          setError(null);
          setPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
          setShowTransferTools(false);
          setShowDeviceImport(false);
          setShowAccountDetails(false);
          setEditingAccountPlayer(false);
          showDialog();
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

    useEffect(() => {
      if (!transferToast) return;
      const timeout = window.setTimeout(() => setTransferToast(null), 5200);
      return () => window.clearTimeout(timeout);
    }, [transferToast]);

    useEffect(() => {
      const visibleGameIds = new Set(localGames.map((game) => game.id));
      setSelectedLocalGameIds((current) =>
        current.filter((id) => visibleGameIds.has(id)),
      );
    }, [localGames]);

    useEffect(() => {
      const visibleProfileIds = new Set(
        localProfiles.map((profile) => profile.id),
      );
      setSelectedLocalProfileIds((current) =>
        current.filter((id) => visibleProfileIds.has(id)),
      );
    }, [localProfiles]);

    function toggleLocalGame(gameId: string) {
      setSelectedLocalGameIds((current) =>
        current.includes(gameId)
          ? current.filter((id) => id !== gameId)
          : [...current, gameId],
      );
    }

    function toggleFilteredLocalGames() {
      const visibleIds = filteredLocalGames.map((game) => game.id);
      if (visibleIds.length === 0) return;

      setSelectedLocalGameIds((current) => {
        const allVisibleSelected = visibleIds.every((id) =>
          current.includes(id),
        );
        if (allVisibleSelected) {
          return current.filter((id) => !visibleIds.includes(id));
        }
        return Array.from(new Set([...current, ...visibleIds]));
      });
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
      setTransferToast(null);

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
      setTransferToast(null);

      try {
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          trimmedEmail,
          {
            redirectTo,
          },
        );
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
      setTransferToast(null);

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
      setTransferToast(null);
      try {
        const { error: updateError } = (await supabase?.auth.updateUser({
          data: {
            name,
            full_name: name,
            display_name: name,
            player_name: name,
          },
        })) ?? { error: null };
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

    function showTransferToast(message: string, tone: ToastTone = "default") {
      setNotice(null);
      setTransferToast({ message, tone });
    }

    function openUrl(url: string) {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    function startUpgradeFlow() {
      if (selectedCheckoutUrl) {
        openUrl(selectedCheckoutUrl);
        return;
      }

      showTransferToast(
        "Pro checkout is not connected yet. Add the checkout URL in env when billing is ready.",
      );
    }

    function restoreSubscription() {
      if (proRestoreUrl) {
        openUrl(proRestoreUrl);
        return;
      }

      showTransferToast(
        "Restore subscription will be available once billing is connected.",
      );
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
      setTransferToast(null);

      try {
        const result = await onImportLocalData({
          gameIds: selectedLocalGameIds,
          profileIds: selectedLocalProfileIds,
        });
        const parts = formatTransferParts(result);

        if (parts.length === 0) {
          showTransferToast("Nothing new to import from this device.");
          return;
        }

        showTransferToast(
          `Imported ${parts.join(" and ")} to your account.`,
          "success",
        );
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
      setTransferToast(null);

      try {
        const result = await onImportBackupFile(file, transferSelection);
        const parts = formatTransferParts(result);

        if (parts.length === 0) {
          showTransferToast(
            "No new sessions or players were found in that backup file.",
          );
          return;
        }

        showTransferToast(
          `Imported ${parts.join(" and ")} from backup file.`,
          "success",
        );
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
      setTransferToast(null);

      try {
        await onDownloadBackupFile(transferSelection);
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
          setTransferToast(null);
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
          {transferToast && session && !recoveryMode ? (
            <div
              className={`authDialog__toast authDialog__toast--${transferToast.tone}`}
              role="status"
              aria-live="polite"
            >
              {transferToast.message}
            </div>
          ) : null}

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
              <div className="authDialog__accountOverview">
                {session.user.email ? (
                  <div
                    className="authDialog__accountIdentity"
                    aria-label="Signed in account"
                  >
                    <div className="authDialog__accountIdentityTop">
                      <span className="authDialog__accountPlayerTitle">
                        Email
                      </span>
                      <span
                        className={`authDialog__accountPlanBadge authDialog__accountPlanBadge--${
                          isPro ? "pro" : "free"
                        }`}
                      >
                        {isPro ? "PRO" : "FREE"}
                      </span>
                    </div>
                    <span className="authDialog__accountEmail">
                      {session.user.email}
                    </span>
                  </div>
                ) : null}
                <section className="authDialog__accountPlayerSection">
                  <div className="authDialog__accountPlayerTitle">
                    Player profile
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
                        {getInitials(
                          accountDraftName || accountPlayerName || "Player",
                        )}
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
                                  setAccountDraftColor(
                                    accountPlayer.avatarColor,
                                  );
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
                                  setAccountDraftColor(
                                    accountPlayer.avatarColor,
                                  );
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
                                onClick={() =>
                                  setAccountDraftColor(color.value)
                                }
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
                                  setAccountDraftColor(
                                    accountPlayer.avatarColor,
                                  );
                                  setEditingAccountPlayer(true);
                                }}
                                aria-label="Edit account player"
                                title="Edit"
                              >
                                <Pencil
                                  size={15}
                                  strokeWidth={2.2}
                                  aria-hidden="true"
                                />
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
                        <ChevronDown size={18} strokeWidth={2.2} />
                      </span>
                    </button>
                    <div className="authDialog__storageStats">
                      <span>
                        <strong>{accountGamesCount}</strong>
                        <span>sessions</span>
                      </span>
                      <span>
                        <strong>{accountProfilesCount}</strong>
                        <span>players</span>
                      </span>
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
                <section
                  className="authDialog__planSection"
                  ref={planSectionRef}
                >
                  <div
                    className={`authDialog__planCard${showPlanDetails ? "" : " authDialog__planCard--collapsed"}`}
                  >
                    {!isPro && !showPlanDetails ? (
                      <div className="authDialog__planHeader">
                        <div className="authDialog__planToggleHeader authDialog__planToggleHeader--static">
                          <div className="authDialog__planTop">
                            <div className="authDialog__planTitleWrap">
                              <span className="authDialog__accountPlayerTitle">
                                Plan
                              </span>
                              <strong className="authDialog__planName">
                                <span>Free plan</span>
                              </strong>
                              <span className="authDialog__planMeta">
                                Core scoring with ads and a limited session
                                history.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="authDialog__planHeader">
                        <button
                          type="button"
                          className="authDialog__planToggleHeader"
                          onClick={() => setShowPlanDetails((value) => !value)}
                          aria-expanded={showPlanDetails}
                          aria-controls="auth-plan-details"
                        >
                          <div className="authDialog__planTop">
                            <div className="authDialog__planTitleWrap">
                              <span className="authDialog__accountPlayerTitle">
                                Plan
                              </span>
                              <strong className="authDialog__planName">
                                {isPro ? (
                                  <>
                                    <span
                                      className="authDialog__planNameAccent"
                                      aria-hidden="true"
                                    >
                                      <Crown size={14} strokeWidth={2.4} />
                                    </span>
                                    <span>Plink Pro</span>
                                  </>
                                ) : (
                                  <span>Free plan</span>
                                )}
                              </strong>
                              <span className="authDialog__planMeta">
                                {isPro
                                  ? source === "override"
                                    ? "Pro forced from environment override"
                                    : source === "subscription"
                                      ? "Subscription loaded from your account"
                                      : source === "account"
                                        ? "Subscription connected to this account"
                                        : "Pro features are enabled"
                                  : "Core scoring with ads and a limited session history."}
                              </span>
                            </div>
                            <div className="authDialog__planHeaderRight">
                              <span
                                className={`authDialog__storageChevron${showPlanDetails ? " authDialog__storageChevron--open" : ""}`}
                                aria-hidden="true"
                              >
                                <ChevronDown size={18} strokeWidth={2.2} />
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                    {!isPro && !showPlanDetails ? (
                      <button
                        type="button"
                        className="btn btn--primary btn--wide authDialog__planExpandCta authDialog__planExpandCta--bottom"
                        onClick={() => setShowPlanDetails(true)}
                      >
                        <Crown size={16} strokeWidth={2.3} aria-hidden="true" />
                        Get Pro
                      </button>
                    ) : null}
                    {showPlanDetails ? (
                      <div
                        id="auth-plan-details"
                        className="authDialog__planBody"
                      >
                        {!isPro ? (
                          <div className="authDialog__planHero authDialog__planHero--copyOnly">
                            <div className="authDialog__planHeroCopy">
                              <strong>Need more than the basics?</strong>
                              <span>
                                Upgrade to Pro for ad-free play, advanced stats,
                                team support, and unlimited session history.
                              </span>
                            </div>
                          </div>
                        ) : null}
                        <div className="authDialog__planBenefits">
                          <div className="authDialog__planBenefit">
                            <span
                              className="authDialog__planBenefitIcon"
                              aria-hidden="true"
                            >
                              <Check size={15} strokeWidth={2.6} />
                            </span>
                            <span>Unlimited saved sessions</span>
                          </div>
                          <div className="authDialog__planBenefit">
                            <span
                              className="authDialog__planBenefitIcon"
                              aria-hidden="true"
                            >
                              <Check size={15} strokeWidth={2.6} />
                            </span>
                            <span>Ad-free experience</span>
                          </div>
                          <div className="authDialog__planBenefit">
                            <span
                              className="authDialog__planBenefitIcon"
                              aria-hidden="true"
                            >
                              <Check size={15} strokeWidth={2.6} />
                            </span>
                            <span>Advanced player stats and reporting</span>
                          </div>
                          <div className="authDialog__planBenefit">
                            <span
                              className="authDialog__planBenefitIcon"
                              aria-hidden="true"
                            >
                              <Check size={15} strokeWidth={2.6} />
                            </span>
                            <span>Teams support for grouped players</span>
                          </div>
                        </div>

                        {!isPro ? (
                          <>
                            <div
                              className="authDialog__planOptions"
                              role="radiogroup"
                              aria-label="Choose billing period"
                            >
                              <button
                                type="button"
                                role="radio"
                                aria-checked={
                                  selectedBillingPeriod === "monthly"
                                }
                                className={`authDialog__planOption${
                                  selectedBillingPeriod === "monthly"
                                    ? " authDialog__planOption--active"
                                    : ""
                                }`}
                                onClick={() =>
                                  setSelectedBillingPeriod("monthly")
                                }
                              >
                                <div className="authDialog__planOptionTop">
                                  <strong>Monthly</strong>
                                  <span>2.99 EUR / month</span>
                                </div>
                                <small>
                                  Flexible option if you want to try Pro first.
                                </small>
                              </button>
                              <button
                                type="button"
                                role="radio"
                                aria-checked={
                                  selectedBillingPeriod === "yearly"
                                }
                                className={`authDialog__planOption${
                                  selectedBillingPeriod === "yearly"
                                    ? " authDialog__planOption--active"
                                    : ""
                                }`}
                                onClick={() =>
                                  setSelectedBillingPeriod("yearly")
                                }
                              >
                                <div className="authDialog__planOptionTop">
                                  <strong>Yearly</strong>
                                  <span>17.99 EUR / year</span>
                                </div>
                                <small>
                                  Lower annual cost and the best fit for regular
                                  use.
                                </small>
                              </button>
                            </div>
                            <div className="authDialog__planActions">
                              <button
                                className="btn btn--primary btn--wide"
                                type="button"
                                onClick={startUpgradeFlow}
                              >
                                {selectedBillingPeriod === "monthly"
                                  ? "Buy Pro Monthly"
                                  : "Buy Pro Yearly"}
                              </button>
                              <button
                                className="btn btn--ghost btn--wide"
                                type="button"
                                onClick={restoreSubscription}
                              >
                                Restore subscription
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="authDialog__planStatus">
                            {source === "override"
                              ? "Pro is currently enabled by environment override."
                              : source === "subscription"
                                ? "Your subscription is loaded from the subscriptions table."
                                : source === "account"
                                  ? "Your account is recognized as Pro."
                                  : "Pro features are active."}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
              <div className="authDialog__transfer">
                <button
                  className="authDialog__transferToggle"
                  type="button"
                  onClick={() => setShowTransferTools((value) => !value)}
                  aria-expanded={showTransferTools}
                  aria-controls="auth-data-tools"
                >
                  <span className="authDialog__transferHead">
                    <span className="authDialog__label">Data transfer</span>
                    <span className="authDialog__text">
                      Add device sessions to this account, restore a backup, or
                      download a copy.
                    </span>
                  </span>
                  <span
                    className={`authDialog__transferChevron${showTransferTools ? " authDialog__transferChevron--open" : ""}`}
                    aria-hidden="true"
                  >
                    <ChevronDown size={18} strokeWidth={2.2} />
                  </span>
                </button>
                {showTransferTools ? (
                  <div
                    id="auth-data-tools"
                    className="authDialog__transferBody"
                  >
                    <div className="authDialog__transferBlock">
                      <div className="authDialog__transferTitle">
                        Add to account
                      </div>
                      <p className="authDialog__text">
                        Choose sessions or players you want saved in this
                        account.
                      </p>
                      <div className="authDialog__transferActions">
                        <button
                          className="authDialog__deviceToggle"
                          type="button"
                          onClick={() => setShowDeviceImport((value) => !value)}
                          disabled={busy || !hasLocalData}
                          aria-expanded={showDeviceImport}
                        >
                          <span>Sessions on this device</span>
                          <span
                            className={`authDialog__deviceToggleChevron${showDeviceImport ? " authDialog__deviceToggleChevron--open" : ""}`}
                            aria-hidden="true"
                          >
                            <ChevronDown size={17} strokeWidth={2.2} />
                          </span>
                        </button>
                      </div>
                      {showDeviceImport && hasLocalData ? (
                        <div
                          ref={deviceImportRef}
                          className="authDialog__deviceImport"
                        >
                          {localGames.length > 0 ? (
                            <div className="authDialog__deviceGroup">
                              <div className="authDialog__deviceGroupTitle">
                                Choose sessions to add
                              </div>
                              <div className="authDialog__deviceTools">
                                <input
                                  className="input input--compact authDialog__deviceSearch"
                                  type="search"
                                  value={localSessionSearch}
                                  onChange={(event) =>
                                    setLocalSessionSearch(event.target.value)
                                  }
                                  placeholder="Search sessions or players"
                                  aria-label="Search sessions saved on this device"
                                />
                                {filteredLocalGames.length >= 2 ? (
                                  <label className="authDialog__selectAll">
                                    <input
                                      type="checkbox"
                                      checked={allFilteredLocalGamesSelected}
                                      onChange={toggleFilteredLocalGames}
                                      disabled={!hasFilteredLocalGames}
                                    />
                                    <span>Select all</span>
                                  </label>
                                ) : null}
                              </div>
                              <div className="authDialog__deviceList authDialog__deviceList--scroll">
                                {filteredLocalGames.map((game) => (
                                  <label
                                    key={game.id}
                                    className="authDialog__deviceItem authDialog__deviceItem--session"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedLocalGameIds.includes(
                                        game.id,
                                      )}
                                      onChange={() => toggleLocalGame(game.id)}
                                    />
                                    <span className="authDialog__deviceSessionText">
                                      <span className="authDialog__deviceSessionTitle">
                                        <strong>{game.name}</strong>
                                        <span
                                          className="authDialog__sessionAvatars"
                                          aria-label={`${game.players.length} player${game.players.length === 1 ? "" : "s"}`}
                                        >
                                          {game.players
                                            .slice(0, 4)
                                            .map((player) => (
                                              <span
                                                key={player.id}
                                                className="authDialog__sessionAvatar"
                                                style={avatarStyleFor(
                                                  player.avatarColor,
                                                )}
                                                title={player.name}
                                              >
                                                {getInitials(player.name)}
                                              </span>
                                            ))}
                                          {game.players.length > 4 ? (
                                            <span className="authDialog__sessionAvatar authDialog__sessionAvatar--more">
                                              +{game.players.length - 4}
                                            </span>
                                          ) : null}
                                        </span>
                                      </span>
                                    </span>
                                  </label>
                                ))}
                                {!hasFilteredLocalGames ? (
                                  <div className="authDialog__deviceEmpty">
                                    No sessions match your search.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          {localProfiles.length > 0 ? (
                            <div className="authDialog__deviceGroup">
                              <div className="authDialog__deviceGroupTitle">
                                Players saved on this device
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
                            className="btn authDialog__actionBtn authDialog__actionBtn--add"
                            type="button"
                            onClick={() => void runImportFromDevice()}
                            disabled={busy || !hasSelectedLocalData}
                          >
                            <span
                              className="authDialog__actionIcon"
                              aria-hidden="true"
                            >
                              <Plus size={16} strokeWidth={2.4} />
                            </span>
                            <span>
                              {busy ? "Working..." : "Add selected to account"}
                            </span>
                          </button>
                        </div>
                      ) : null}
                      <div className="authDialog__transferActions">
                        <button
                          className="btn btn--ghost authDialog__actionBtn authDialog__actionBtn--file"
                          type="button"
                          onClick={() => backupInputRef.current?.click()}
                          disabled={busy}
                        >
                          <span
                            className="authDialog__actionIcon"
                            aria-hidden="true"
                          >
                            <FileUp size={15} strokeWidth={2.1} />
                          </span>
                          <span>Restore from backup file</span>
                        </button>
                      </div>
                    </div>
                    <div className="authDialog__transferBlock">
                      <div className="authDialog__transferTitle">
                        Backup copy
                      </div>
                      <p className="authDialog__text">
                        Download a file you can keep safe or restore later.
                      </p>
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
                            onChange={(e) =>
                              setIncludeProfiles(e.target.checked)
                            }
                          />
                          <span>Players</span>
                        </label>
                      </div>
                      <div className="authDialog__transferActions">
                        <button
                          className="btn btn--ghost authDialog__actionBtn authDialog__actionBtn--download"
                          type="button"
                          onClick={() => void runDownloadBackupFile()}
                          disabled={busy}
                        >
                          <span
                            className="authDialog__actionIcon"
                            aria-hidden="true"
                          >
                            <Download size={15} strokeWidth={2.1} />
                          </span>
                          <span>
                            {busy ? "Working..." : "Download backup copy"}
                          </span>
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
              </div>
              {notice ? (
                <div className="authDialog__notice">{notice}</div>
              ) : null}
              {error ? <div className="authDialog__error">{error}</div> : null}
              <button
                className="btn btn--wide btn--dangerSolid authDialog__signOutBtn"
                type="button"
                onClick={signOut}
                disabled={busy}
              >
                <LogOut size={17} strokeWidth={2.3} aria-hidden="true" />
                <span>{busy ? "Signing out..." : "Sign out"}</span>
              </button>
              <div className="authDialog__links" aria-label="Account links">
                <a href="/privacy.html">Privacy</a>
                <span aria-hidden="true">·</span>
                <a href="/support.html">Support</a>
              </div>
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
                <div className="authDialog__links" aria-label="Account links">
                  <a href="/privacy.html">Privacy</a>
                  <span aria-hidden="true">·</span>
                  <a href="/support.html">Support</a>
                </div>
              </div>
            </>
          )}
        </div>
      </dialog>
    );
  },
);
