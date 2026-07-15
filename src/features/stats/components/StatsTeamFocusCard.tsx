import { Flame, Medal, SquareActivity, Trophy } from "lucide-react";
import { AdBannerSlot } from "../../../components/AdBannerSlot/AdBannerSlot";
import { LockedFrame } from "../../../components/HomeLockedState/LockedFrame";
import { StatsSkeleton } from "../../../components/HomeLockedState/StatsSkeleton";
import { StatsAdvancedCards } from "./StatsAdvancedCards";
import { StatsCharts } from "./StatsCharts";
import { StatsProPreview } from "./StatsProPreview";
import {
  ComparisonMetricCard,
  EntitySwatch,
  MetricCard,
  PanelHeader,
  PickerButton,
  PickerPopover,
  StatsScreenEmpty,
} from "./StatsScreenParts";
import {
  compareValues,
  formatAveragePlacement,
  getDisplayName,
} from "../utils/statsUtils";
import { avatarStyleFor } from "../../../utils/color";
import { formatAccountPlayerName, getInitials } from "../../../utils/text";
import type { PlayerProfile } from "../../../types";
import type { SelectableEntity } from "../types/statsTypes";
import type { SubjectReport } from "../../../utils/advancedStats";
import { useStatsScreenContext } from "../context/StatsScreenContext";

type Props = {
  report: SubjectReport;
  option: SelectableEntity | null;
  memberProfiles: PlayerProfile[];
  eyebrow: string;
};
export function StatsTeamFocusCard({
  report,
  option,
  memberProfiles,
  eyebrow,
}: Props) {
  return (
    <section className="statsFocusCard">
      <div className="statsFocusCard__identity">
        {option ? <EntitySwatch option={option} /> : null}
        <div className="statsFocusCard__copy">
          <span className="statsEyebrow">{eyebrow}</span>
          <h3>{getDisplayName(report)}</h3>
          <p>
            {memberProfiles.length} member
            {memberProfiles.length === 1 ? "" : "s"} tracked across{" "}
            {report.gamesPlayed} team sessions.
          </p>
        </div>
      </div>
      {memberProfiles.length ? (
        <div className="statsFocusMembers">
          {memberProfiles.map((profile) => (
            <span key={profile.id} className="statsFocusMember">
              <span
                className="statsFocusMember__avatar"
                style={avatarStyleFor(profile.avatarColor)}
                aria-hidden="true"
              >
                {getInitials(profile.name)}
              </span>
              <span>
                {profile.isAccountPlayer
                  ? formatAccountPlayerName(profile.name)
                  : profile.name}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
