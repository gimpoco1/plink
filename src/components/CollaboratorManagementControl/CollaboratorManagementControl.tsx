import "./CollaboratorManagementControl.css";

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export function CollaboratorManagementControl({
  enabled,
  onChange,
}: Props) {
  return (
    <label className="collaboratorManagementControl">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="collaboratorManagementControl__copy">
        <strong>Allow invited players to change settings</strong>
        <span>
          They can always update scores. This also lets them reset or end the
          game.
        </span>
      </span>
    </label>
  );
}
