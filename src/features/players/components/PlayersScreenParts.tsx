import { getCurrentLanguage, translate } from "../../../i18n/translate";
import { AVATAR_COLORS, TEAM_ICONS } from "../../../constants";
import type { PlayerRatingHistoryEntry } from "../../../types";
import type { SessionResultSummary } from "../../../utils/profileStats";
import { TeamIcon } from "../../../components/TeamIcon/TeamIcon";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { usePlayerRatingsContext } from "../../playerRatings/PlayerRatingsContext";

export function GamesDropdown({
  title,
  sessionResults,
  profileId,
  onEnter,
}: {
  title: string;
  sessionResults: SessionResultSummary[];
  profileId?: string;
  onEnter?: (gameId: string) => void;
}) {
  const { historyByGameAndProfile } = usePlayerRatingsContext();
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
        {sessionResults.map((result) => {
          const ratingEntry = profileId
            ? historyByGameAndProfile.get(`${result.gameId}:${profileId}`)
            : undefined;
          return (
            <div key={result.id} className="profileCard__gameResult">
              {ratingEntry ? <SessionRatingChange entry={ratingEntry} /> : null}
              <span className="profileCard__gameResultMain">
                <button
                  type="button"
                  className="profileCard__gameResultNameBtn"
                  onClick={() => onEnter?.(result.gameId)}
                  disabled={!onEnter}
                >
                  <span className="profileCard__gameResultName">
                    {result.name}
                  </span>
                </button>
                {result.isTeamGame ? (
                  <span className="profileCard__gameResultBadge">
                    {translate("home.teams")}
                  </span>
                ) : null}
              </span>
              <span className="profileCard__gameResultStatus">
                {ratingEntry ? (
                  <div className="profileCard__ratingInline">
                    <span
                      className={`profileCard__ratingDelta profileCard__ratingDelta--${
                        ratingEntry.newLevel > ratingEntry.previousLevel
                          ? "up"
                          : ratingEntry.newLevel < ratingEntry.previousLevel
                            ? "down"
                            : "same"
                      }`}
                    >
                      {formatLevel(
                        ratingEntry.newLevel - ratingEntry.previousLevel,
                      )}
                    </span>
                    <strong className="profileCard__ratingLevel profileCard__ratingLevel--inline">
                      {formatLevel(ratingEntry.newLevel)}
                    </strong>
                  </div>
                ) : null}
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
          );
        })}
      </div>
    </details>
  );
}

function formatLevel(level: number) {
  return level.toLocaleString(getCurrentLanguage(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function SessionRatingChange({ entry }: { entry: PlayerRatingHistoryEntry }) {
  const displayedChange =
    Math.round(entry.newLevel * 10) / 10 -
    Math.round(entry.previousLevel * 10) / 10;
  const direction =
    displayedChange > 0 ? "up" : displayedChange < 0 ? "down" : "same";
  return (
    <div className="profileCard__ratingChange">
      <span
        className={`profileCard__ratingChangeIcon profileCard__ratingChangeIcon--${direction}`}
        aria-hidden="true"
      >
        {direction === "up" ? (
          <TrendingUp size={15} strokeWidth={2.5} />
        ) : direction === "down" ? (
          <TrendingDown size={15} strokeWidth={2.5} />
        ) : (
          <Minus size={15} strokeWidth={2.5} />
        )}
      </span>
    </div>
  );
}

function statusLabel(status: SessionResultSummary["statusKind"]) {
  if (status === "won") return "Won";
  if (status === "lost") return translate("copy.lost");
  if (status === "draw") return translate("copy.draw");
  if (status === "in_progress") return translate("copy.inProgress");
  return translate("copy.completed");
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
      aria-label={translate("dynamic.iconFor", [label])}
    >
      {TEAM_ICONS.map((icon) => (
        <button
          key={icon.id}
          type="button"
          className={`teamIconPicker__option${layout === "grid" ? " teamIconPicker__option--grid" : ""}${compactGrid ? " teamIconPicker__option--compactGrid" : ""}${value === icon.id ? " teamIconPicker__option--active" : ""}`}
          aria-label={translate("dynamic.useIconFor", [
            translate(icon.label),
            label,
          ])}
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
          aria-label={translate("dynamic.useColorFor", [
            translate(color.label),
            label,
          ])}
          aria-pressed={value === color.value}
          aria-disabled={disabled}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
