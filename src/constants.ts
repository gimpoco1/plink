import { translate } from "./i18n/translate";
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
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/plink-scorekeeper/id6791116577";
export const REFRESH_PAST_LINKED_PLAYERS_EVENT =
  "plink:refreshPastLinkedPlayers";
export const REFRESH_PAST_INVITED_PLAYERS_EVENT =
  "plink:refreshPastInvitedPlayers";
export const LOCAL_SESSIONS_HINT_DISMISSED_KEY =
  "plink:localSessionsHintDismissed:v1";
export const GAME_TIMER_STORAGE_KEY = "plink:timer:v1";
export const MAX_ABS_SCORE = 999999;
export const DEFAULT_QUICK_SCORE_VALUES = [1, 2] as const;
export const DEFAULT_TEAM_ICON = "dumbbell";
export const TEAM_ICONS = [
  { id: "dumbbell", label: translate("copy.training") },
  { id: "trophy", label: translate("copy.champions") },
  { id: "shield", label: translate("copy.defense") },
  { id: "flag", label: translate("copy.flag") },
  { id: "target", label: translate("new.target") },
  { id: "zap", label: translate("copy.fast") },
  { id: "flame", label: translate("copy.fire") },
  { id: "star", label: translate("copy.allStars") },
] as const;

export const AVATAR_COLORS = [
  { id: "graphite", label: translate("copy.graphite"), value: "#6b7890" },
  { id: "sky", label: translate("copy.sky"), value: "#36aeea" },
  { id: "aqua", label: translate("copy.aqua"), value: "#31cfc3" },
  { id: "mint", label: translate("copy.mint"), value: "#47d97d" },
  { id: "lime", label: translate("copy.lime"), value: "#9fbe38" },
  { id: "coral", label: translate("copy.coral"), value: "#f36f85" },
  { id: "violet", label: translate("copy.violet"), value: "#9276e8" },
  { id: "stone", label: translate("copy.stone"), value: "#aba39b" },
] as const;
