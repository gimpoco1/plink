import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";

export function QuickSetupTeamIcon({ icon }: { icon?: string }) {
  return (
    <TeamIcon icon={icon} size={16} strokeWidth={2.35} aria-hidden="true" />
  );
}
