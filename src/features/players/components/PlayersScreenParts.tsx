import { AVATAR_COLORS, TEAM_ICONS } from "../../../constants";
import type { SessionResultSummary } from "../../../utils/profileStats";
import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";

export function GamesDropdown({
  title,
  sessionResults,
}: {
  title: string;
  sessionResults: SessionResultSummary[];
}) {
  return (
    <details className="profileGamesDropdown">
      <summary className="profileGamesDropdown__summary">
        <div className="profileGamesDropdown__summaryLeft">
          <span className="profileGamesDropdown__title">{title}</span>
        </div>
        <span className="profileGamesDropdown__count">
          {sessionResults.length}
        </span>
      </summary>
      <div className="profileCard__gameResults">
        {sessionResults.map((result) => (
          <div key={result.id} className="profileCard__gameResult">
            <span className="profileCard__gameResultMain">
              <span className="profileCard__gameResultName">{result.name}</span>
              {result.isTeamGame ? (
                <span className="profileCard__gameResultBadge">Teams</span>
              ) : null}
            </span>
            <span className="profileCard__gameResultStatus">
              {result.teamName ? (
                <span className="profileCard__gameResultTeamContext">
                  {result.teamIcon ? (
                    <span
                      className="profileCard__gameResultTeamIcon"
                      aria-hidden="true"
                    >
                      <TeamIcon
                        icon={result.teamIcon}
                        size={14}
                        strokeWidth={2.3}
                      />
                    </span>
                  ) : null}
                  <span className="profileCard__gameResultTeamName">
                    {result.teamName}
                  </span>
                </span>
              ) : null}
              <strong
                className={`profileCard__statusBadge profileCard__statusBadge--${result.statusKind}`}
              >
                {statusLabel(result.statusKind)}
              </strong>
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function statusLabel(status: SessionResultSummary["statusKind"]) {
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  if (status === "draw") return "Draw";
  if (status === "in_progress") return "In Progress";
  return "Completed";
}

export function TeamIconPicker({
  value,
  onChange,
  label,
  layout = "strip",
  density = "default",
}: {
  value: string;
  onChange: (icon: string) => void;
  label: string;
  layout?: "strip" | "grid";
  density?: "default" | "compact";
}) {
  const compactGrid = layout === "grid" && density === "compact";
  return (
    <div
      className={`teamIconPicker${layout === "grid" ? " teamIconPicker--grid" : ""}${compactGrid ? " teamIconPicker--compactGrid" : ""}`}
      aria-label={`Icon for ${label}`}
    >
      {TEAM_ICONS.map((icon) => (
        <button
          key={icon.id}
          type="button"
          className={`teamIconPicker__option${layout === "grid" ? " teamIconPicker__option--grid" : ""}${compactGrid ? " teamIconPicker__option--compactGrid" : ""}${value === icon.id ? " teamIconPicker__option--active" : ""}`}
          aria-label={`Use ${icon.label} icon for ${label}`}
          aria-pressed={value === icon.id}
          onClick={() => onChange(icon.id)}
        >
          <TeamIcon icon={icon.id} />
        </button>
      ))}
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
  label,
  compact = false,
  disabled = false,
}: {
  value: string;
  onChange: (color: (typeof AVATAR_COLORS)[number]["value"]) => void;
  label: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={`profileCard__colors${compact ? " profileCard__colors--compact" : ""}`}
    >
      {AVATAR_COLORS.map((color) => (
        <button
          key={color.id}
          className={`colorDot ${value === color.value ? "active" : ""}`}
          style={{ backgroundColor: color.value }}
          onClick={() => !disabled && onChange(color.value)}
          aria-label={`Use ${color.id} color for ${label}`}
          aria-pressed={value === color.value}
          aria-disabled={disabled}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
