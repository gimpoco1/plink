export const STORAGE_KEY = "point-tracker:v1";
export const PROFILES_STORAGE_KEY = "point-tracker:profiles:v1";
export const GAMES_STORAGE_KEY = "point-tracker:games:v1";
export const CURRENT_GAME_ID_KEY = "point-tracker:currentGameId:v1";
export const QUICK_DELTAS = [-2, -1, 1, 2] as const;

export const GAME_ACCENT_COLORS = [
  "#6ea8fe",
  "#7cdbd5",
  "#f7b267",
  "#ff7aa2",
  "#86efac",
  "#a78bfa",
  "#fca5a5",
  "#fcd34d",
  "#a6c656",
] as const;

export const AVATAR_COLORS = [
  { id: "slate", label: "Slate", value: "#64748b" },
  { id: "sky", label: "Sky", value: "#38bdf8" },
  { id: "teal", label: "Teal", value: "#2dd4bf" },
  { id: "green", label: "Green", value: "#4ade80" },
  { id: "amber", label: "Amber", value: "#fbbf24" },
  { id: "rose", label: "Rose", value: "#fb7185" },
  { id: "violet", label: "Violet", value: "#a78bfa" },
  { id: "stone", label: "Stone", value: "#a8a29e" }
] as const;
