export const STORAGE_KEY = "plink:v1";
export const PROFILES_STORAGE_KEY = "plink:profiles:v1";
export const GAMES_STORAGE_KEY = "plink:games:v1";
export const CURRENT_GAME_ID_KEY = "plink:currentGameId:v1";
export const GUEST_GAMES_STORAGE_KEY = "plink:guest:games:v1";
export const GUEST_CURRENT_GAME_ID_KEY = "plink:guest:currentGameId:v1";
export const APP_VIEW_STORAGE_KEY = "plink:view:v1";
export const HOME_TAB_STORAGE_KEY = "plink:homeTab:v1";
export const PLAYERS_VIEW_STORAGE_KEY = "plink:playersView:v1";
export const HOME_NEW_GAME_OPEN_KEY = "plink:homeNewGameOpen:v1";
export const LOCAL_SESSIONS_HINT_DISMISSED_KEY =
  "plink:localSessionsHintDismissed:v1";
export const GAME_TIMER_STORAGE_KEY = "plink:timer:v1";
export const QUICK_DELTAS = [-2, -1, 1, 2] as const;
export const MAX_ABS_SCORE = 999999;
export const DEFAULT_TEAM_ICON = "dumbbell";
export const TEAM_ICONS = [
  { id: "dumbbell", label: "Training" },
  { id: "trophy", label: "Champions" },
  { id: "shield", label: "Defense" },
  { id: "flag", label: "Flag" },
  { id: "target", label: "Target" },
  { id: "zap", label: "Fast" },
  { id: "flame", label: "Fire" },
  { id: "star", label: "All stars" },
] as const;

export const AVATAR_COLORS = [
  { id: "graphite", label: "Graphite", value: "#6b7890" },
  { id: "sky", label: "Sky", value: "#36aeea" },
  { id: "aqua", label: "Aqua", value: "#31cfc3" },
  { id: "mint", label: "Mint", value: "#47d97d" },
  { id: "lime", label: "Lime", value: "#9fbe38" },
  { id: "coral", label: "Coral", value: "#f36f85" },
  { id: "violet", label: "Violet", value: "#9276e8" },
  { id: "stone", label: "Stone", value: "#aba39b" },
] as const;
