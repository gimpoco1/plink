/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_ENTITLEMENTS_OVERRIDE_PLAN?: string;
  readonly VITE_PRO_MONTHLY_URL?: string;
  readonly VITE_PRO_YEARLY_URL?: string;
  readonly VITE_PRO_RESTORE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
