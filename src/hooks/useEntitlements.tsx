import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { SUBSCRIPTION_SYNCED_EVENT } from "../features/billing/appleSubscriptionSync";
import { supabase } from "../lib/supabase";

export type SubscriptionPlan = "free" | "pro";
export type SubscriptionBillingPeriod = "monthly" | "yearly";
export type SubscriptionProvider = "stripe" | "apple";
type SubscriptionStatus =
  | "active"
  | "trialing"
  | "inactive"
  | "past_due"
  | "canceled";
type EntitlementSource = "default" | "account" | "subscription" | "override";
const FREE_SESSION_LIMIT = 12;
const ACTIVE_PRO_STATUSES = new Set<SubscriptionStatus>(["active", "trialing"]);

export type EntitlementsState = {
  isLoading: boolean;
  plan: SubscriptionPlan;
  source: EntitlementSource;
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionProvider: SubscriptionProvider | null;
  subscriptionBillingPeriod: SubscriptionBillingPeriod | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionStartedAt: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  subscriptionCancelAt: string | null;
  subscriptionCanceledAt: string | null;
  shouldShowAds: boolean;
  canUseTeams: boolean;
  canSeeAdvancedStats: boolean;
  hasUnlimitedSessions: boolean;
  maxSessions: number | null;
};

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

function normalizeBillingPeriod(
  value: unknown,
): SubscriptionBillingPeriod | null {
  if (value === "monthly" || value === "yearly") return value;
  return null;
}

function normalizeSubscriptionProvider(
  value: unknown,
): SubscriptionProvider | null {
  return value === "stripe" || value === "apple" ? value : null;
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
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [subscriptionProvider, setSubscriptionProvider] =
    useState<SubscriptionProvider | null>(null);
  const [subscriptionBillingPeriod, setSubscriptionBillingPeriod] =
    useState<SubscriptionBillingPeriod | null>(null);
  const [subscriptionCurrentPeriodEnd, setSubscriptionCurrentPeriodEnd] =
    useState<string | null>(null);
  const [subscriptionStartedAt, setSubscriptionStartedAt] = useState<
    string | null
  >(null);
  const [subscriptionCancelAtPeriodEnd, setSubscriptionCancelAtPeriodEnd] =
    useState(false);
  const [subscriptionCancelAt, setSubscriptionCancelAt] = useState<
    string | null
  >(null);
  const [subscriptionCanceledAt, setSubscriptionCanceledAt] = useState<
    string | null
  >(null);
  const [hasSubscriptionRecord, setHasSubscriptionRecord] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const accountPlan = getAccountPlan(session);
  const userId = session?.user.id ?? null;
  const isLoading =
    !envOverridePlan && !!userId && !!supabase && resolvedUserId !== userId;

  useEffect(() => {
    if (envOverridePlan || !userId || !supabase) {
      setSubscriptionPlan(null);
      setSubscriptionStatus(null);
      setSubscriptionProvider(null);
      setSubscriptionBillingPeriod(null);
      setSubscriptionCurrentPeriodEnd(null);
      setSubscriptionStartedAt(null);
      setSubscriptionCancelAtPeriodEnd(false);
      setSubscriptionCancelAt(null);
      setSubscriptionCanceledAt(null);
      setHasSubscriptionRecord(false);
      setResolvedUserId(userId);
      return;
    }

    const client = supabase;
    let alive = true;

    async function refreshSubscription() {
      try {
        const { data, error } = await client
          .from("subscriptions")
          .select(
            "plan,status,provider,billing_period,current_period_end,created_at,cancel_at_period_end,cancel_at,canceled_at",
          )
          .eq("user_id", userId)
          .maybeSingle();

        if (!alive) return;

        if (error || !data) {
          if (alive) {
            setSubscriptionPlan(null);
            setSubscriptionStatus(null);
            setSubscriptionProvider(null);
            setSubscriptionBillingPeriod(null);
            setSubscriptionCurrentPeriodEnd(null);
            setSubscriptionStartedAt(null);
            setSubscriptionCancelAtPeriodEnd(false);
            setSubscriptionCancelAt(null);
            setSubscriptionCanceledAt(null);
            setHasSubscriptionRecord(false);
            setResolvedUserId(userId);
          }
          return;
        }

        const normalizedPlan = normalizePlan(data.plan);
        const normalizedStatus = normalizeSubscriptionStatus(data.status);
        const normalizedProvider = normalizeSubscriptionProvider(data.provider);
        const normalizedBillingPeriod = normalizeBillingPeriod(
          data.billing_period,
        );
        // Fail closed: only explicit active/trialing pro records unlock Pro.
        const effectivePlan: SubscriptionPlan =
          normalizedPlan === "pro" &&
          normalizedStatus !== null &&
          ACTIVE_PRO_STATUSES.has(normalizedStatus)
            ? "pro"
            : "free";

        setSubscriptionPlan(effectivePlan);
        setSubscriptionStatus(normalizedStatus);
        setSubscriptionProvider(normalizedProvider);
        setSubscriptionBillingPeriod(normalizedBillingPeriod);
        setSubscriptionCurrentPeriodEnd(
          typeof data.current_period_end === "string"
            ? data.current_period_end
            : null,
        );
        setSubscriptionStartedAt(
          typeof data.created_at === "string" ? data.created_at : null,
        );
        setSubscriptionCancelAtPeriodEnd(Boolean(data.cancel_at_period_end));
        setSubscriptionCancelAt(
          typeof data.cancel_at === "string" ? data.cancel_at : null,
        );
        setSubscriptionCanceledAt(
          typeof data.canceled_at === "string" ? data.canceled_at : null,
        );
        setHasSubscriptionRecord(true);
        setResolvedUserId(userId);
      } catch {
        if (alive) {
          setSubscriptionPlan(null);
          setSubscriptionStatus(null);
          setSubscriptionProvider(null);
          setSubscriptionBillingPeriod(null);
          setSubscriptionCurrentPeriodEnd(null);
          setSubscriptionStartedAt(null);
          setSubscriptionCancelAtPeriodEnd(false);
          setSubscriptionCancelAt(null);
          setSubscriptionCanceledAt(null);
          setHasSubscriptionRecord(false);
          setResolvedUserId(userId);
        }
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshSubscription();
    }

    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null =
      null;
    channel = client.channel(`subscriptions:${userId}`);
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "subscriptions",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refreshSubscription();
      },
    );
    void channel.subscribe();

    void refreshSubscription();
    const intervalId = window.setInterval(refreshSubscription, 5000);
    window.addEventListener("focus", refreshSubscription);
    window.addEventListener(SUBSCRIPTION_SYNCED_EVENT, refreshSubscription);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      if (channel) {
        void channel.unsubscribe();
        client.removeChannel(channel);
      }
      window.removeEventListener("focus", refreshSubscription);
      window.removeEventListener(
        SUBSCRIPTION_SYNCED_EVENT,
        refreshSubscription,
      );
      document.removeEventListener("visibilitychange", refreshWhenVisible);
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
      isLoading,
      plan,
      source,
      isPro,
      subscriptionStatus,
      subscriptionProvider,
      subscriptionBillingPeriod,
      subscriptionCurrentPeriodEnd,
      subscriptionStartedAt,
      subscriptionCancelAtPeriodEnd,
      subscriptionCancelAt,
      subscriptionCanceledAt,
      shouldShowAds: !isLoading && !isPro,
      canUseTeams: isPro,
      canSeeAdvancedStats: isPro,
      hasUnlimitedSessions: isPro,
      maxSessions: isPro ? null : FREE_SESSION_LIMIT,
    };
  }, [
    accountPlan,
    envOverridePlan,
    hasSubscriptionRecord,
    isLoading,
    subscriptionBillingPeriod,
    subscriptionCancelAt,
    subscriptionCancelAtPeriodEnd,
    subscriptionCanceledAt,
    subscriptionCurrentPeriodEnd,
    subscriptionStartedAt,
    subscriptionPlan,
    subscriptionProvider,
    subscriptionStatus,
  ]);
}

export {
  EntitlementsProvider,
  useEntitlementsContext,
} from "./EntitlementsContext";
