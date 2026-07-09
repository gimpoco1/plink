/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_ADSENSE_CLIENT_ID?: string;
  readonly VITE_ADSENSE_SESSIONS_SLOT_ID?: string;
  readonly VITE_ADSENSE_PLAYERS_SLOT_ID?: string;
  readonly VITE_SHOW_AD_SLOTS?: string;
  readonly VITE_SHOW_AD_PLACEHOLDERS?: string;
  readonly VITE_ENTITLEMENTS_OVERRIDE_PLAN?: string;
  readonly VITE_PRO_MONTHLY_URL?: string;
  readonly VITE_PRO_YEARLY_URL?: string;
  readonly VITE_PRO_RESTORE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
