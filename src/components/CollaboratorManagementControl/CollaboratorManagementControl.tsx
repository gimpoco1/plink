import { translate } from "../../i18n/translate";
import "./CollaboratorManagementControl.css";

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export function CollaboratorManagementControl({ enabled, onChange }: Props) {
  return (
    <label className="collaboratorManagementControl">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="collaboratorManagementControl__copy">
        <strong>
          {translate("copy.allowInvitedPlayersToChangeSettings")}
        </strong>
        <span>
          {translate("copy.theyCanAlwaysUpdateScoresThisAlsoLetsThemResetOrEnd")}
        </span>
      </span>
    </label>
  );
}
