export const STORAGE_KEY = "point-tracker:v1";
export const PROFILES_STORAGE_KEY = "point-tracker:profiles:v1";
export const GAMES_STORAGE_KEY = "point-tracker:games:v1";
export const CURRENT_GAME_ID_KEY = "point-tracker:currentGameId:v1";
export const GUEST_GAMES_STORAGE_KEY = "point-tracker:guest:games:v1";
export const GUEST_CURRENT_GAME_ID_KEY = "point-tracker:guest:currentGameId:v1";
export const APP_VIEW_STORAGE_KEY = "point-tracker:view:v1";
export const HOME_TAB_STORAGE_KEY = "point-tracker:homeTab:v1";
export const GAME_TIMER_STORAGE_KEY = "point-tracker:timer:v1";
export const QUICK_DELTAS = [-2, -1, 1, 2] as const;
export const MAX_ABS_SCORE = 999999;

export const AVATAR_COLORS = [
  { id: "graphite", label: "Graphite", value: "#6b7890" },
  { id: "sky", label: "Sky", value: "#36aeea" },
  { id: "aqua", label: "Aqua", value: "#31cfc3" },
  { id: "mint", label: "Mint", value: "#47d97d" },
  { id: "lime", label: "Lime", value: "#9fbe38" },
  { id: "coral", label: "Coral", value: "#f36f85" },
  { id: "violet", label: "Violet", value: "#9276e8" },
  { id: "stone", label: "Stone", value: "#aba39b" }
] as const;
