import type { ReactNode } from "react";

export type ConfirmPlayer = { name: string; avatarColor: string };
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
  tone?: "default" | "danger";
  eyebrow?: string;
  highlights?: string[];
  details?: ConfirmDetail[];
  detailFlow?: boolean;
  settingChips?: ConfirmSettingChip[];
  playersTitle?: string;
  players?: ConfirmPlayer[];
  teams?: ConfirmTeam[];
  layout?: "default" | "feature";
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
