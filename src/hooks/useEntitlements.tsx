import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type SubscriptionPlan = "free" | "pro";
type SubscriptionStatus =
  | "active"
  | "trialing"
  | "inactive"
  | "past_due"
  | "canceled";
type EntitlementSource = "default" | "account" | "subscription" | "override";
const FREE_SESSION_LIMIT = 2;
const ACTIVE_PRO_STATUSES = new Set<SubscriptionStatus>(["active", "trialing"]);

export type EntitlementsState = {
  plan: SubscriptionPlan;
  source: EntitlementSource;
  isPro: boolean;
  shouldShowAds: boolean;
  canUseTeams: boolean;
  canSeeAdvancedStats: boolean;
  hasUnlimitedSessions: boolean;
  maxSessions: number | null;
};

const fallbackState: EntitlementsState = {
  plan: "free",
  source: "default",
  isPro: false,
  shouldShowAds: true,
  canUseTeams: false,
  canSeeAdvancedStats: false,
  hasUnlimitedSessions: false,
  maxSessions: FREE_SESSION_LIMIT,
};

const EntitlementsContext = createContext<EntitlementsState>(fallbackState);

function normalizePlan(value: unknown): SubscriptionPlan | null {
  if (value === "pro" || value === "free") return value;
  return null;
}

function normalizeSubscriptionStatus(
  value: unknown,
): SubscriptionStatus | null {
  if (
    value === "active" ||
    value === "trialing" ||
    value === "inactive" ||
    value === "past_due" ||
    value === "canceled"
  ) {
    return value;
  }

  return null;
}

function getAccountPlan(session: Session | null): SubscriptionPlan | null {
  if (!session) return null;

  return (
    normalizePlan(session.user.app_metadata?.plan) ??
    normalizePlan(session.user.app_metadata?.subscription_plan)
  );
}

export function useEntitlements(session: Session | null): EntitlementsState {
  const envOverridePlan = normalizePlan(
    import.meta.env.VITE_ENTITLEMENTS_OVERRIDE_PLAN?.trim().toLowerCase(),
  );
  const [subscriptionPlan, setSubscriptionPlan] =
    useState<SubscriptionPlan | null>(null);
  const [hasSubscriptionRecord, setHasSubscriptionRecord] = useState(false);
  const accountPlan = getAccountPlan(session);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (envOverridePlan || !userId || !supabase) {
      setSubscriptionPlan(null);
      setHasSubscriptionRecord(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("plan,status")
          .eq("user_id", userId)
          .maybeSingle();

        if (cancelled || error || !data) {
          if (!cancelled) {
            setSubscriptionPlan(null);
            setHasSubscriptionRecord(false);
          }
          return;
        }

        const normalizedPlan = normalizePlan(data.plan);
        const normalizedStatus = normalizeSubscriptionStatus(data.status);
        // Fail closed: only explicit active/trialing pro records unlock Pro.
        const effectivePlan: SubscriptionPlan =
          normalizedPlan === "pro" &&
          normalizedStatus !== null &&
          ACTIVE_PRO_STATUSES.has(normalizedStatus)
            ? "pro"
            : "free";

        setSubscriptionPlan(effectivePlan);
        setHasSubscriptionRecord(true);
      } catch {
        if (!cancelled) {
          setSubscriptionPlan(null);
          setHasSubscriptionRecord(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [envOverridePlan, userId]);

  return useMemo(() => {
    const plan = envOverridePlan ?? subscriptionPlan ?? accountPlan ?? "free";
    const source: EntitlementSource = envOverridePlan
      ? "override"
      : hasSubscriptionRecord
        ? "subscription"
        : accountPlan
          ? "account"
          : "default";
    const isPro = plan === "pro";

    return {
      plan,
      source,
      isPro,
      shouldShowAds: !isPro,
      canUseTeams: isPro,
      canSeeAdvancedStats: isPro,
      hasUnlimitedSessions: isPro,
      maxSessions: isPro ? null : FREE_SESSION_LIMIT,
    };
  }, [accountPlan, envOverridePlan, hasSubscriptionRecord, subscriptionPlan]);
}

export function EntitlementsProvider({
  value,
  children,
}: PropsWithChildren<{ value: EntitlementsState }>) {
  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlementsContext() {
  return useContext(EntitlementsContext);
}
