import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { SUBSCRIPTION_SYNCED_EVENT } from "../features/billing/appleSubscriptionSync";
import { supabase } from "../lib/supabase";
import {
  createRealtimeReconnectHandler,
  subscribeToForegroundRefresh,
} from "../utils/foregroundRefresh";

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
const FREE_SESSION_LIMIT = 2;
const SESSION_PASS_LIMIT = 100;
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
  hasSessionPass: boolean;
  sessionPassProvider: SubscriptionProvider | null;
  sessionPassPurchasedAt: string | null;
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
  const [hasSessionPass, setHasSessionPass] = useState(false);
  const [sessionPassProvider, setSessionPassProvider] =
    useState<SubscriptionProvider | null>(null);
  const [sessionPassPurchasedAt, setSessionPassPurchasedAt] = useState<
    string | null
  >(null);
  const [sessionPassLimit, setSessionPassLimit] =
    useState(SESSION_PASS_LIMIT);
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
      setHasSessionPass(false);
      setSessionPassProvider(null);
      setSessionPassPurchasedAt(null);
      setSessionPassLimit(SESSION_PASS_LIMIT);
      setResolvedUserId(userId);
      return;
    }

    const client = supabase;
    let alive = true;

    async function refreshEntitlements() {
      try {
        const [subscriptionResult, sessionPassResult] = await Promise.all([
          client
            .from("subscriptions")
            .select(
              "plan,status,provider,billing_period,current_period_end,created_at,cancel_at_period_end,cancel_at,canceled_at",
            )
            .eq("user_id", userId)
            .maybeSingle(),
          client
            .from("session_pass_purchases")
            .select("provider,session_limit,purchased_at,status")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("session_limit", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!alive) return;

        const subscription = subscriptionResult.data;
        if (subscriptionResult.error || !subscription) {
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
        } else {
          const normalizedPlan = normalizePlan(subscription.plan);
          const normalizedStatus = normalizeSubscriptionStatus(
            subscription.status,
          );
          const normalizedProvider = normalizeSubscriptionProvider(
            subscription.provider,
          );
          const normalizedBillingPeriod = normalizeBillingPeriod(
            subscription.billing_period,
          );
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
            typeof subscription.current_period_end === "string"
              ? subscription.current_period_end
              : null,
          );
          setSubscriptionStartedAt(
            typeof subscription.created_at === "string"
              ? subscription.created_at
              : null,
          );
          setSubscriptionCancelAtPeriodEnd(
            Boolean(subscription.cancel_at_period_end),
          );
          setSubscriptionCancelAt(
            typeof subscription.cancel_at === "string"
              ? subscription.cancel_at
              : null,
          );
          setSubscriptionCanceledAt(
            typeof subscription.canceled_at === "string"
              ? subscription.canceled_at
              : null,
          );
          setHasSubscriptionRecord(true);
        }

        const sessionPass = sessionPassResult.data;
        if (sessionPassResult.error || !sessionPass) {
          setHasSessionPass(false);
          setSessionPassProvider(null);
          setSessionPassPurchasedAt(null);
          setSessionPassLimit(SESSION_PASS_LIMIT);
        } else {
          setHasSessionPass(true);
          setSessionPassProvider(
            normalizeSubscriptionProvider(sessionPass.provider),
          );
          setSessionPassPurchasedAt(
            typeof sessionPass.purchased_at === "string"
              ? sessionPass.purchased_at
              : null,
          );
          setSessionPassLimit(
            typeof sessionPass.session_limit === "number" &&
                Number.isFinite(sessionPass.session_limit)
              ? Math.max(SESSION_PASS_LIMIT, sessionPass.session_limit)
              : SESSION_PASS_LIMIT,
          );
        }
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
          setHasSessionPass(false);
          setSessionPassProvider(null);
          setSessionPassPurchasedAt(null);
          setSessionPassLimit(SESSION_PASS_LIMIT);
          setResolvedUserId(userId);
        }
      }
    }

    const unsubscribeForegroundRefresh = subscribeToForegroundRefresh(
      () => void refreshEntitlements(),
    );

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
        void refreshEntitlements();
      },
    );
    void channel.subscribe(
      createRealtimeReconnectHandler(() => void refreshEntitlements()),
    );

    let sessionPassChannel: ReturnType<
      NonNullable<typeof supabase>["channel"]
    > | null = null;
    sessionPassChannel = client.channel(`session-pass:${userId}`);
    sessionPassChannel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "session_pass_purchases",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refreshEntitlements();
      },
    );
    void sessionPassChannel.subscribe(
      createRealtimeReconnectHandler(() => void refreshEntitlements()),
    );

    void refreshEntitlements();
    window.addEventListener(SUBSCRIPTION_SYNCED_EVENT, refreshEntitlements);

    return () => {
      alive = false;
      unsubscribeForegroundRefresh();
      if (channel) {
        void channel.unsubscribe();
        client.removeChannel(channel);
      }
      if (sessionPassChannel) {
        void sessionPassChannel.unsubscribe();
        client.removeChannel(sessionPassChannel);
      }
      window.removeEventListener(
        SUBSCRIPTION_SYNCED_EVENT,
        refreshEntitlements,
      );
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
      hasSessionPass,
      sessionPassProvider,
      sessionPassPurchasedAt,
      maxSessions: isPro
        ? null
        : hasSessionPass
          ? sessionPassLimit
          : FREE_SESSION_LIMIT,
    };
  }, [
    accountPlan,
    envOverridePlan,
    hasSubscriptionRecord,
    hasSessionPass,
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
    sessionPassLimit,
    sessionPassProvider,
    sessionPassPurchasedAt,
  ]);
}

export {
  EntitlementsProvider,
  useEntitlementsContext,
} from "./EntitlementsContext";
