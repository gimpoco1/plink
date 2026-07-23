import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from "react";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  type Provider,
  type Session,
  type User,
} from "@supabase/supabase-js";
import { Browser } from "@capacitor/browser";
import { AVATAR_COLORS } from "../../constants";
import { useAppleSubscription } from "../../features/billing/useAppleSubscription";
import { useEntitlementsContext } from "../../hooks/useEntitlements";
import { hasSupabaseConfig, supabase } from "../../lib/supabase";
import {
  NATIVE_AUTH_COMPLETED_EVENT,
  getAuthRedirectUrl,
  isNativeApp,
  isNativeIOSApp,
  openExternalUrl,
} from "../../lib/nativePlatform";
import type { BackupSelection } from "../../storage/backupFile";
import {
  loadRemoteSharingPreference,
  updateRemoteSharingPreference,
} from "../../storage/remoteStorage";
import type { Game, PlayerProfile, ToastState, ToastTone } from "../../types";
import { formatPlayerName } from "../../utils/text";

export type AuthDialogHandle = {
  open: () => void;
  openPlan: () => void;
  openLocalImport: () => void;
  openPasswordReset: () => void;
  close: () => void;
};

export type DataTransferResult = {
  games: number;
  profiles: number;
  teams: number;
  skippedTeamContent?: boolean;
};

export type AuthDialogProps = {
  session: Session | null;
  onOpenChange?: (open: boolean) => void;
  onConfirmSignOut: () => Promise<boolean>;
  onConfirmAccountDeletion: () => Promise<boolean>;
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
  }) => Promise<DataTransferResult> | DataTransferResult;
  onImportBackupFile?: (
    file: File,
    selection: BackupSelection,
  ) => Promise<DataTransferResult> | DataTransferResult;
  onDownloadBackupFile?: (
    selection: BackupSelection,
  ) => Promise<DataTransferResult> | DataTransferResult;
};

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function isExistingAccountSignUpResponse(user: User | null) {
  return !!user && !user.is_anonymous && (user.identities?.length ?? 0) === 0;
}

export function useAuthDialogModel(
  props: AuthDialogProps,
  ref: ForwardedRef<AuthDialogHandle>,
) {
  const {
    session,
    onOpenChange,
    onConfirmSignOut,
    onConfirmAccountDeletion,
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
  } = props;
  const {
    isLoading: entitlementsLoading,
    source,
    isPro,
    subscriptionCancelAt,
    subscriptionCancelAtPeriodEnd,
    subscriptionCurrentPeriodEnd,
    subscriptionProvider,
    subscriptionStartedAt,
    subscriptionStatus,
  } = useEntitlementsContext();
  const appleSubscription = useAppleSubscription(session);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const nativeOAuthPendingRef = useRef(false);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const deviceImportRef = useRef<HTMLDivElement | null>(null);
  const planSectionRef = useRef<HTMLElement | null>(null);
  const accountColorOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const billingPeriodOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountDraftName, setAccountDraftName] = useState("");
  const [accountDraftColor, setAccountDraftColor] = useState("");
  const [editingAccountPlayer, setEditingAccountPlayer] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [transferToast, setTransferToast] = useState<ToastState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signupConfirmationEmail, setSignupConfirmationEmail] = useState<
    string | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<Provider | null>(null);
  const [confirmingAccountDeletion, setConfirmingAccountDeletion] =
    useState(false);
  const [hasStripeBillingProfile, setHasStripeBillingProfile] = useState(false);
  const [showTransferTools, setShowTransferTools] = useState(false);
  const [showDeviceImport, setShowDeviceImport] = useState(false);
  const [showDevicePlayersImport, setShowDevicePlayersImport] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [
    allowPreviousPlayersToInvite,
    setAllowPreviousPlayersToInvite,
  ] = useState(true);
  const [sharingPreferenceLoading, setSharingPreferenceLoading] =
    useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [localSessionSearch, setLocalSessionSearch] = useState("");
  const [includeGames, setIncludeGames] = useState(true);
  const [includeProfiles, setIncludeProfiles] = useState(true);
  const [selectedLocalGameIds, setSelectedLocalGameIds] = useState<string[]>(
    () => localGames.map((game) => game.id),
  );
  const [selectedLocalProfileIds, setSelectedLocalProfileIds] = useState<
    string[]
  >(() => localProfiles.map((profile) => profile.id));
  const selectedLocalGameIdsRef = useRef(selectedLocalGameIds);
  const selectedLocalProfileIdsRef = useRef(selectedLocalProfileIds);
  const normalizedLocalSessionSearch = localSessionSearch.trim().toLowerCase();
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
    filteredLocalGames.every((game) => selectedLocalGameIds.includes(game.id));
  const isAwaitingSignupConfirmation =
    mode === "signup" && !!signupConfirmationEmail;
  const transferSelection: BackupSelection = {
    games: includeGames,
    profiles: includeProfiles,
  };
  const accountPlayer =
    accountProfiles.find((profile) => profile.isAccountPlayer) ?? null;
  const accountPlayerName = accountPlayer?.name ?? "";
  const accountPlayerColor =
    accountPlayer?.avatarColor ?? AVATAR_COLORS[0]?.value ?? "#64748b";
  const userId = session?.user.id ?? null;
  const effectiveSubscriptionEndDate = useMemo(() => {
    if (
      subscriptionCancelAtPeriodEnd &&
      (subscriptionStatus === "active" || subscriptionStatus === "trialing")
    ) {
      return subscriptionCancelAt ?? subscriptionCurrentPeriodEnd;
    }

    if (subscriptionStatus === "canceled") {
      return subscriptionCancelAt ?? subscriptionCurrentPeriodEnd;
    }

    return subscriptionCurrentPeriodEnd;
  }, [
    subscriptionCancelAt,
    subscriptionCancelAtPeriodEnd,
    subscriptionCurrentPeriodEnd,
    subscriptionStatus,
  ]);
  const formattedSubscriptionEndDate = useMemo(() => {
    if (!effectiveSubscriptionEndDate) return null;

    const date = new Date(effectiveSubscriptionEndDate);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }, [effectiveSubscriptionEndDate]);
  const renewalLabel = useMemo(() => {
    if (
      !formattedSubscriptionEndDate ||
      !subscriptionStatus ||
      source !== "subscription"
    ) {
      return null;
    }

    if (
      subscriptionCancelAtPeriodEnd &&
      (subscriptionStatus === "active" || subscriptionStatus === "trialing")
    ) {
      return `Ends on ${formattedSubscriptionEndDate}`;
    }

    if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
      return `Renews on ${formattedSubscriptionEndDate}`;
    }

    if (subscriptionStatus === "canceled") {
      return `Ends on ${formattedSubscriptionEndDate}`;
    }

    return null;
  }, [
    formattedSubscriptionEndDate,
    source,
    subscriptionCancelAtPeriodEnd,
    subscriptionStatus,
  ]);
  const sinceLabel = useMemo(() => {
    if (!subscriptionStartedAt || source !== "subscription") return null;

    const date = new Date(subscriptionStartedAt);
    if (Number.isNaN(date.getTime())) return null;

    return `Since ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
    }).format(date)}`;
  }, [source, subscriptionStartedAt]);
  const billingPeriodOptions = ["monthly", "yearly"] as const;

  function focusOption(
    refs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    index: number,
  ) {
    refs.current[index]?.focus();
  }

  function getWrappedIndex(
    length: number,
    currentIndex: number,
    delta: number,
  ) {
    return (currentIndex + delta + length) % length;
  }

  function handleAccountColorRadioKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = getWrappedIndex(AVATAR_COLORS.length, index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = getWrappedIndex(AVATAR_COLORS.length, index, -1);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = AVATAR_COLORS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextColor = AVATAR_COLORS[nextIndex];
    if (!nextColor) return;
    setAccountDraftColor(nextColor.value);
    focusOption(accountColorOptionRefs, nextIndex);
  }

  function handleBillingPeriodRadioKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = getWrappedIndex(billingPeriodOptions.length, index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = getWrappedIndex(billingPeriodOptions.length, index, -1);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = billingPeriodOptions.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextPeriod = billingPeriodOptions[nextIndex];
    if (!nextPeriod) return;
    setSelectedBillingPeriod(nextPeriod);
    focusOption(billingPeriodOptionRefs, nextIndex);
  }

  function resetDialogState() {
    nativeOAuthPendingRef.current = false;
    setBusy(false);
    setOauthProvider(null);
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
    setSelectedBillingPeriod("monthly");
    setEditingAccountPlayer(false);
    setConfirmingAccountDeletion(false);
    setShowDevicePlayersImport(false);
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

  function showNativePurchaseResult(message: string, tone: ToastTone) {
    const revealResult = () => {
      showDialog();
      showTransferToast(message, tone);
    };

    revealResult();
    window.requestAnimationFrame(revealResult);
    window.setTimeout(revealResult, 250);
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
        setNotice(null);
        setTransferToast({
          message: "Enter a new password for your account.",
          tone: "default",
        });
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
    selectedLocalGameIdsRef.current = selectedLocalGameIds;
  }, [selectedLocalGameIds]);

  useEffect(() => {
    selectedLocalProfileIdsRef.current = selectedLocalProfileIds;
  }, [selectedLocalProfileIds]);

  useEffect(() => {
    if (!transferToast) return;
    const timeout = window.setTimeout(() => setTransferToast(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [transferToast]);

  useEffect(() => {
    function resetNativeOAuth() {
      nativeOAuthPendingRef.current = false;
      setOauthProvider(null);
      setBusy(false);
    }

    function handleNativeAuthError(event: Event) {
      const message =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : "Authentication failed.";
      resetNativeOAuth();
      setError(message);
      setNotice(null);
      showDialog();
    }

    function handleNativeAuthCompleted() {
      if (!nativeOAuthPendingRef.current) return;
      resetNativeOAuth();
      if (dialogRef.current?.open) {
        onOpenChange?.(false);
        dialogRef.current.close();
      }
    }

    const browserListener = isNativeApp()
      ? Browser.addListener("browserFinished", () => {
          if (nativeOAuthPendingRef.current) resetNativeOAuth();
        })
      : null;

    window.addEventListener("plink:auth-error", handleNativeAuthError);
    window.addEventListener(
      NATIVE_AUTH_COMPLETED_EVENT,
      handleNativeAuthCompleted,
    );
    return () => {
      window.removeEventListener("plink:auth-error", handleNativeAuthError);
      window.removeEventListener(
        NATIVE_AUTH_COMPLETED_EVENT,
        handleNativeAuthCompleted,
      );
      void browserListener?.then((handle) => handle.remove());
    };
  }, [onOpenChange]);

  useEffect(() => {
    if (!userId || !supabase) {
      setHasStripeBillingProfile(false);
      return;
    }

    let alive = true;
    const client = supabase;

    async function refreshBillingProfile() {
      try {
        const { data, error: loadError } = await client
          .from("subscriptions")
          .select("customer_id,provider")
          .eq("user_id", userId)
          .maybeSingle();

        if (!alive) return;
        if (
          loadError ||
          data?.provider !== "stripe" ||
          !data.customer_id
        ) {
          setHasStripeBillingProfile(false);
          return;
        }

        setHasStripeBillingProfile(true);
      } catch {
        if (alive) {
          setHasStripeBillingProfile(false);
        }
      }
    }

    const channel = client.channel(`subscription-billing:${userId}`);
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "subscriptions",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refreshBillingProfile();
      },
    );
    void channel.subscribe();
    void refreshBillingProfile();

    return () => {
      alive = false;
      void channel.unsubscribe();
      client.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !supabase) {
      setAllowPreviousPlayersToInvite(true);
      setSharingPreferenceLoading(false);
      return;
    }

    let alive = true;
    setSharingPreferenceLoading(true);
    void loadRemoteSharingPreference()
      .then((allow) => {
        if (alive) setAllowPreviousPlayersToInvite(allow);
      })
      .catch((loadError) => {
        console.error("Failed to load sharing preference", loadError);
      })
      .finally(() => {
        if (alive) setSharingPreferenceLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  async function updateSharingPreference(allow: boolean) {
    if (!userId || sharingPreferenceLoading) return;
    const previous = allowPreviousPlayersToInvite;
    setAllowPreviousPlayersToInvite(allow);
    setSharingPreferenceLoading(true);
    setError(null);
    try {
      const savedValue = await updateRemoteSharingPreference(allow);
      setAllowPreviousPlayersToInvite(savedValue);
    } catch (saveError) {
      console.error("Failed to update sharing preference", saveError);
      setAllowPreviousPlayersToInvite(previous);
      setError("Could not update sharing preference.");
    } finally {
      setSharingPreferenceLoading(false);
    }
  }

  useEffect(() => {
    const visibleGameIds = new Set(localGames.map((game) => game.id));
    const current = selectedLocalGameIdsRef.current;
    const next = current.filter((id) => visibleGameIds.has(id));
    if (areStringArraysEqual(current, next)) return;
    setSelectedLocalGameIds(next);
  }, [localGames]);

  useEffect(() => {
    const visibleProfileIds = new Set(
      localProfiles.map((profile) => profile.id),
    );
    const current = selectedLocalProfileIdsRef.current;
    const next = current.filter((id) => visibleProfileIds.has(id));
    if (areStringArraysEqual(current, next)) return;
    setSelectedLocalProfileIds(next);
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
      const allVisibleSelected = visibleIds.every((id) => current.includes(id));
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

  function openEmailApp() {
    if (typeof window === "undefined") return;

    const target = signupConfirmationEmail?.trim() || email.trim();
    window.location.href = target
      ? `mailto:${encodeURIComponent(target)}`
      : "mailto:";
  }

  async function signInWithProvider(provider: Provider) {
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    const native = isNativeApp();
    nativeOAuthPendingRef.current = native;
    setOauthProvider(provider);
    setBusy(true);
    setError(null);
    setNotice(null);
    setSignupConfirmationEmail(null);
    setTransferToast(null);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectUrl(),
          skipBrowserRedirect: native,
          queryParams:
            provider === "google"
              ? {
                  prompt: "select_account",
                }
              : undefined,
        },
      });
      if (oauthError) throw oauthError;
      if (native) {
        if (!data.url) throw new Error("The sign-in page could not be opened.");
        await openExternalUrl(data.url);
      }
    } catch (err) {
      nativeOAuthPendingRef.current = false;
      setOauthProvider(null);
      setBusy(false);
      setError(getAuthErrorMessage(err, "Could not start sign-in."));
    }
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
    setSignupConfirmationEmail(null);
    setTransferToast(null);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
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
            emailRedirectTo: getAuthRedirectUrl(),
            data: {
              name: trimmedAccountName,
              full_name: trimmedAccountName,
              display_name: trimmedAccountName,
              player_name: trimmedAccountName,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (isExistingAccountSignUpResponse(data.user)) {
          setSignupConfirmationEmail(null);
          setError(
            "An account with this email already exists. Sign in instead.",
          );
          return;
        }
        if (!data.session) {
          setPassword("");
          setSignupConfirmationEmail(trimmedEmail);
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
      const redirectTo = getAuthRedirectUrl("recovery");
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
    if (!supabase || busy) return;
    const confirmed = await onConfirmSignOut();
    if (!confirmed) return;
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

  function formatTransferParts(result: DataTransferResult) {
    return [
      result.games
        ? `${result.games} session${result.games === 1 ? "" : "s"}`
        : "",
      result.profiles
        ? `${result.profiles} player${result.profiles === 1 ? "" : "s"}`
        : "",
      result.teams
        ? `${result.teams} team${result.teams === 1 ? "" : "s"}`
        : "",
    ].filter(Boolean);
  }

  function showTransferToast(message: string, tone: ToastTone = "default") {
    setNotice(null);
    setTransferToast({ message, tone });
  }

  async function openUrl(url: string) {
    try {
      await openExternalUrl(url);
    } catch {
      showTransferToast("This link is not valid.", "error");
    }
  }

  function getBillingErrorMessage(err: unknown, fallback: string) {
    if (err instanceof Error && err.message) {
      return err.message;
    }

    return fallback;
  }

  async function getInvokeErrorMessage(err: unknown, fallback: string) {
    if (err instanceof FunctionsHttpError) {
      try {
        const payload = (await err.context.json()) as { error?: string };
        if (payload?.error) {
          return payload.error;
        }
      } catch {
        return fallback;
      }
    }

    if (
      err instanceof FunctionsRelayError ||
      err instanceof FunctionsFetchError
    ) {
      return err.message || fallback;
    }

    return getBillingErrorMessage(err, fallback);
  }

  async function requestBillingUrl(
    functionName: "create-checkout-session" | "create-customer-portal-session",
    body: Record<string, unknown>,
    fallback: string,
  ) {
    if (!supabase || !hasSupabaseConfig) {
      throw new Error("Supabase is not configured yet.");
    }

    const { data, error: invokeError } = await supabase.functions.invoke<{
      url?: string;
      error?: string;
    }>(functionName, {
      body,
    });

    if (invokeError) {
      throw new Error(await getInvokeErrorMessage(invokeError, fallback));
    }

    if (!data?.url) {
      throw new Error(data?.error || fallback);
    }

    return data.url;
  }

  async function startUpgradeFlow() {
    if (!session) {
      setError("Sign in before starting a subscription.");
      return;
    }
    if (isNativeIOSApp()) {
      let purchaseResult: ToastState = {
        message: "The purchase could not be completed.",
        tone: "error",
      };
      setBusy(true);
      setError(null);
      setNotice(null);
      setTransferToast(null);
      try {
        const result = await appleSubscription.purchase(selectedBillingPeriod);
        if (result.status === "cancelled") {
          purchaseResult = {
            message: "Purchase cancelled.",
            tone: "default",
          };
        } else if (result.status === "pending") {
          purchaseResult = {
            message:
              "Your purchase is waiting for approval. Pro will unlock automatically once Apple approves it.",
            tone: "default",
          };
        } else {
          purchaseResult = {
            message: "Welcome to Plink Pro!",
            tone: "success",
          };
        }
      } catch (err) {
        purchaseResult = {
          message: getBillingErrorMessage(
            err,
            "The purchase could not be completed.",
          ),
          tone: "error",
        };
      } finally {
        setBusy(false);
        showNativePurchaseResult(
          purchaseResult.message,
          purchaseResult.tone,
        );
      }
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    setTransferToast(null);

    try {
      const url = await requestBillingUrl(
        "create-checkout-session",
        {
          billingPeriod: selectedBillingPeriod,
          origin: window.location.origin,
        },
        "Checkout is not available yet.",
      );
      await openUrl(url);
    } catch (err) {
      setError(getBillingErrorMessage(err, "Checkout is not available yet."));
    } finally {
      setBusy(false);
    }
  }

  async function restoreSubscription() {
    if (!session) {
      setError("Sign in before managing a subscription.");
      return;
    }
    if (isNativeIOSApp()) {
      setBusy(true);
      setError(null);
      setNotice(null);
      setTransferToast(null);
      try {
        const result = await appleSubscription.restore();
        showTransferToast(
          result?.active
            ? "Your Plink Pro purchase has been restored."
            : "No active Plink Pro purchase was found for this Apple Account.",
          result?.active ? "success" : "default",
        );
      } catch (err) {
        showTransferToast(
          getBillingErrorMessage(err, "Purchases could not be restored."),
          "error",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    setTransferToast(null);

    try {
      const url = await requestBillingUrl(
        "create-customer-portal-session",
        { origin: window.location.origin },
        "Billing portal is not available yet.",
      );
      await openUrl(url);
    } catch (err) {
      setError(
        getBillingErrorMessage(err, "Billing portal is not available yet."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function manageSubscription() {
    try {
      if (subscriptionProvider === "apple" && isNativeIOSApp()) {
        await appleSubscription.showManageSubscriptions();
        return;
      }

      if (subscriptionProvider === "apple") {
        await openExternalUrl("https://apps.apple.com/account/subscriptions");
        return;
      }

      if (isNativeIOSApp()) {
        await openExternalUrl("https://plinkscore.com");
        return;
      }

      await restoreSubscription();
    } catch (err) {
      showTransferToast(
        getBillingErrorMessage(
          err,
          "Subscription settings could not be opened.",
        ),
        "error",
      );
    }
  }

  async function deleteAccount() {
    if (!supabase || !session) {
      setError("Sign in before deleting your account.");
      return;
    }
    if (busy) return;

    const confirmed = await onConfirmAccountDeletion();
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    setTransferToast(null);

    try {
      const { error: invokeError } = await supabase.functions.invoke(
        "delete-account",
        { body: {} },
      );
      if (invokeError) {
        throw new Error(
          await getInvokeErrorMessage(
            invokeError,
            "Your account could not be deleted.",
          ),
        );
      }

      await supabase.auth.signOut({ scope: "local" });
      setConfirmingAccountDeletion(false);
      if (dialogRef.current?.open) {
        onOpenChange?.(false);
        dialogRef.current.close();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Your account could not be deleted.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runImportFromDevice(
    selection: { gameIds: string[]; profileIds: string[] } = {
      gameIds: selectedLocalGameIds,
      profileIds: selectedLocalProfileIds,
    },
    emptySelectionMessage = "Select at least one session or player to import.",
  ) {
    const { gameIds, profileIds } = selection;

    if (gameIds.length === 0 && profileIds.length === 0) {
      setError(emptySelectionMessage);
      return;
    }

    if (!onImportLocalData) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    setTransferToast(null);

    try {
      const result = await onImportLocalData({
        gameIds,
        profileIds,
      });
      const parts = formatTransferParts(result);

      if (parts.length === 0) {
        showTransferToast(
          result.skippedTeamContent
            ? "Only team-based sessions were selected. Upgrade to Pro to import them."
            : "Nothing new to import from this device.",
        );
        return;
      }

      const skippedTeamContentLabel = result.skippedTeamContent
        ? " Team-based sessions were skipped because this account is on Free plan."
        : "";
      showTransferToast(
        `Imported ${parts.join(" , ")} to your account.${skippedTeamContentLabel}`,
        "success",
      );
    } catch (err) {
      showTransferToast(
        err instanceof Error ? err.message : "Import failed.",
        "error",
      );
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
          result.skippedTeamContent
            ? "This backup only contains team data. Upgrade to Pro to restore it."
            : "No new sessions, players, or teams were found in that backup file.",
        );
        return;
      }

      const skippedTeamContentLabel = result.skippedTeamContent
        ? " Team data was skipped because this account is on Free plan."
        : "";
      showTransferToast(
        `Imported ${parts.join(" and ")} from backup file.${skippedTeamContentLabel}`,
        "success",
      );
    } catch (err) {
      showTransferToast(
        err instanceof Error ? err.message : "Import from file failed.",
        "error",
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
      showTransferToast(
        err instanceof Error ? err.message : "Backup download failed.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    allowPreviousPlayersToInvite,
    hasSupabaseConfig,
    accountColorOptionRefs,
    accountDraftColor,
    accountDraftName,
    accountGames,
    accountGamesCount,
    accountName,
    accountPlayer,
    accountPlayerColor,
    accountPlayerName,
    accountProfiles,
    accountProfilesCount,
    allFilteredLocalGamesSelected,
    backupInputRef,
    billingPeriodOptionRefs,
    busy,
    confirmingAccountDeletion,
    confirmNewPassword,
    deviceImportRef,
    deleteAccount,
    dialogRef,
    editingAccountPlayer,
    email,
    entitlementsLoading,
    error,
    filteredLocalGames,
    handleAccountColorRadioKeyDown,
    handleBillingPeriodRadioKeyDown,
    hasFilteredLocalGames,
    hasStripeBillingProfile,
    appleProductsByPeriod: appleSubscription.productsByPeriod,
    appleProductsError: appleSubscription.productsError,
    appleProductsLoading: appleSubscription.isLoadingProducts,
    includeGames,
    includeProfiles,
    isAwaitingSignupConfirmation,
    isNativeIOS: isNativeIOSApp(),
    isPro,
    localGames,
    localProfiles,
    localSessionSearch,
    mode,
    newPassword,
    notice,
    oauthProvider,
    onOpenChange,
    onUpdateProfile,
    openEmailApp,
    password,
    planSectionRef,
    recoveryMode,
    reloadAppleProducts: appleSubscription.reloadProducts,
    renewalLabel,
    manageSubscription,
    restoreSubscription,
    runDownloadBackupFile,
    runImportFromDevice,
    runImportFromFile,
    saveAccountPlayerName,
    selectedBillingPeriod,
    selectedLocalGameIds,
    selectedLocalProfileIds,
    sendPasswordReset,
    session,
    setAccountDraftColor,
    setAccountDraftName,
    setAccountName,
    setConfirmNewPassword,
    setConfirmingAccountDeletion,
    setEditingAccountPlayer,
    setEmail,
    setError,
    setIncludeGames,
    setIncludeProfiles,
    setLocalSessionSearch,
    setMode,
    setNewPassword,
    setNotice,
    setPassword,
    setRecoveryMode,
    setSelectedBillingPeriod,
    setShowAccountDetails,
    setShowDeviceImport,
    setShowDevicePlayersImport,
    setShowPassword,
    setShowPlanDetails,
    setShowTransferTools,
    setSignupConfirmationEmail,
    setTransferToast,
    showAccountDetails,
    showDeviceImport,
    showDevicePlayersImport,
    showPassword,
    showPlanDetails,
    showTransferTools,
    sharingPreferenceLoading,
    signInWithProvider,
    signOut,
    signupConfirmationEmail,
    sinceLabel,
    source,
    subscriptionProvider,
    startUpgradeFlow,
    submit,
    submitNewPassword,
    toggleFilteredLocalGames,
    toggleLocalGame,
    toggleLocalProfile,
    transferToast,
    updateSharingPreference,
  };
}
