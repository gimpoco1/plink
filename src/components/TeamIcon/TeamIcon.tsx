import type { LucideProps } from "lucide-react";
import {
  Dumbbell,
  Flag,
  Flame,
  Shield,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { DEFAULT_TEAM_ICON } from "../../constants";

const TEAM_ICON_COMPONENTS = {
  dumbbell: Dumbbell,
  trophy: Trophy,
  shield: Shield,
  flag: Flag,
  target: Target,
  zap: Zap,
  flame: Flame,
  star: Star,
} as const;

export type TeamIconName = keyof typeof TEAM_ICON_COMPONENTS;

export function getTeamIconComponent(icon?: string) {
  return (
    TEAM_ICON_COMPONENTS[icon as TeamIconName] ??
    TEAM_ICON_COMPONENTS[DEFAULT_TEAM_ICON as TeamIconName] ??
    Dumbbell
  );
}

type TeamIconProps = LucideProps & {
  icon?: string;
};

export function TeamIcon({ icon, ...props }: TeamIconProps) {
  const Icon = getTeamIconComponent(icon);
  return <Icon {...props} />;
}
