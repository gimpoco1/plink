/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_ADSENSE_CLIENT_ID?: string;
  readonly VITE_ADSENSE_SESSIONS_SLOT_ID?: string;
  readonly VITE_ADSENSE_PLAYERS_SLOT_ID?: string;
  readonly VITE_SHOW_AD_PLACEHOLDERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
