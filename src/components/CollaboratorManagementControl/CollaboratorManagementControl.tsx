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
        <strong>Allow invited players to manage</strong>
        <span>They can change settings, end, or reset this game.</span>
      </span>
    </label>
  );
}
