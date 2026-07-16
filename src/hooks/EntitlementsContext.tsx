import { createContext, useContext, type PropsWithChildren } from "react";
import type { EntitlementsState } from "./useEntitlements";

const fallbackState: EntitlementsState = {
  isLoading: false,
  plan: "free",
  source: "default",
  isPro: false,
  subscriptionStatus: null,
  subscriptionProvider: null,
  subscriptionBillingPeriod: null,
  subscriptionCurrentPeriodEnd: null,
  subscriptionStartedAt: null,
  subscriptionCancelAtPeriodEnd: false,
  subscriptionCancelAt: null,
  subscriptionCanceledAt: null,
  shouldShowAds: true,
  canUseTeams: false,
  canSeeAdvancedStats: false,
  hasUnlimitedSessions: false,
  maxSessions: 12,
};

const EntitlementsContext = createContext<EntitlementsState>(fallbackState);

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
