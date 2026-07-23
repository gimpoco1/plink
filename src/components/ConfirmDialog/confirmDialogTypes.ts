import type { ReactNode } from "react";

export type ConfirmPlayer = {
  id?: string;
  name: string;
  avatarColor: string;
  nameIcon?: ReactNode;
  label?: string;
  description?: string;
  selectedDescription?: string;
  unselectedDescription?: string;
  disabled?: boolean;
};
export type ConfirmPlayerSelectionOptions = Omit<ConfirmOptions, "players"> & {
  players: Array<ConfirmPlayer & { id: string }>;
  initialSelectedPlayerId?: string;
};
export type ConfirmPlayerMultiSelectionOptions = Omit<
  ConfirmOptions,
  "players"
> & {
  players: Array<ConfirmPlayer & { id: string }>;
  initialSelectedPlayerIds?: string[];
};
export type ConfirmDetail = {
  label: string;
  value: string;
  icon?: ReactNode;
  size?: "default" | "wide" | "compact";
};
export type ConfirmSettingChip = {
  label: string;
  description?: string;
  icon?: ReactNode;
  tone?: "accent" | "default";
  size?: "default" | "wide";
};
export type ConfirmRosterNotice = {
  text: string;
  icon?: ReactNode;
};
export type ConfirmTeam = {
  id: string;
  name: string;
  icon?: string;
  members: ConfirmPlayer[];
};
export type ConfirmResult = "confirm" | "cancel" | "extra";
export type ConfirmOptions = {
  title: string;
  bodyTitle?: string;
  message: string;
  messageCase?: "default" | "normal";
  confirmText?: string;
  cancelText?: string;
  hideCancelAction?: boolean;
  extraActionText?: string;
  extraActionDescription?: string;
  tone?: "default" | "danger";
  eyebrow?: string;
  highlights?: string[];
  details?: ConfirmDetail[];
  detailFlow?: boolean;
  settingChips?: ConfirmSettingChip[];
  playersTitle?: string;
  players?: ConfirmPlayer[];
  teams?: ConfirmTeam[];
  rosterNotice?: ConfirmRosterNotice;
  layout?: "default" | "feature";
  selectablePlayers?: boolean;
  multiSelectablePlayers?: boolean;
};
export type PromptOptions = {
  title: string;
  message: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  eyebrow?: string;
  maxLength?: number;
};
export type ConfirmDialogHandle = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  choose: (options: ConfirmOptions) => Promise<ConfirmResult>;
  selectPlayer: (
    options: ConfirmPlayerSelectionOptions,
  ) => Promise<string | null>;
  selectPlayers: (
    options: ConfirmPlayerMultiSelectionOptions,
  ) => Promise<string[] | null>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

export function resolveConfirmEyebrow(next: ConfirmOptions): string {
  if (next.eyebrow?.trim()) return next.eyebrow;
  if (next.tone === "danger") return "Danger zone";
  if (next.layout === "feature") return "Game setup";
  const title = next.title.toLowerCase();
  if (title.includes("delete")) return "Delete check";
  if (title.includes("remove")) return "Roster change";
  if (title.includes("reset")) return "Score reset";
  if (title.includes("not signed in") || title.includes("sign in")) {
    return "Guest mode";
  }
  return "Quick confirm";
}
