import { TeamIcon } from "../TeamIcon/TeamIcon";
import { avatarStyleFor } from "../../utils/color";
import type { Standing } from "./WinCelebration";

export function ShareStat({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="winShareStat">
      <strong className={accent ? "winShareStat__value--accent" : undefined}>
        {value}
      </strong>
      <span>{label}</span>
    </div>
  );
}

export function ShareAvatar({
  entry,
  isTeamGame,
  compact = false,
}: {
  entry: Standing;
  isTeamGame: boolean;
  compact?: boolean;
}) {
  const className = `winShareAvatar${compact ? " winShareAvatar--compact" : ""}`;
  if (isTeamGame && entry.icon) {
    return (
      <div className={`${className} winShareAvatar--team`}>
        <TeamIcon
          icon={entry.icon}
          size={18}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className={className} style={avatarStyleFor(entry.avatarColor)}>
      {entry.initials}
    </div>
  );
}
export function toShareFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "plink"
  );
}

export function StandingAvatar({
  entry,
  isTeamGame,
}: {
  entry: Standing;
  isTeamGame: boolean;
}) {
  if (isTeamGame && entry.icon) {
    return (
      <div className="winFx__avatar winFx__avatar--team" aria-hidden="true">
        <TeamIcon
          icon={entry.icon}
          size={18}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      className="winFx__avatar"
      style={avatarStyleFor(entry.avatarColor)}
      aria-hidden="true"
    >
      {entry.initials}
    </div>
  );
}
