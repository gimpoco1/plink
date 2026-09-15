import { getCurrentLanguage, translate } from "../../i18n/translate";
import { Info } from "lucide-react";
import type { ProfileStats } from "../../utils/profileStats";
import { getPlayerLevel } from "../../utils/playerLevel";
import "./PlayerLevelBadge.css";

type Props = {
  stats?: Pick<
    ProfileStats,
    "level" | "winRate" | "completedGames" | "ratedGames"
  >;
  variant?: "compact" | "summary";
};

export function PlayerLevelBadge({ stats, variant = "compact" }: Props) {
  const level = getPlayerLevel(stats);

  if (variant === "summary") {
    if (level === null) {
      return (
        <div className="playerLevelCard playerLevelSummary--unrated">
          <div className="playerLevelCard__heading">
            <strong>{translate("playerLevel.unrated")}</strong>
          </div>
          <p>{translate("playerLevel.startHint")}</p>
        </div>
      );
    }

    const formattedLevel = level.toLocaleString(getCurrentLanguage(), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const label = translate("playerLevel.label", [formattedLevel]);

    return (
      <div className="playerLevelCard">
        <div className="playerLevelCard__heading">
          <strong>{label}</strong>
          <span>{translate("playerLevel.outOfTen")}</span>
        </div>
        <div className="playerLevelCard__meta">
          <span>{translate("playerLevel.winRateValue", [stats?.winRate])}</span>
          <span aria-hidden="true">·</span>
          <span>
            {translate("playerLevel.ratedGamesValue", [
              stats?.ratedGames.toLocaleString(getCurrentLanguage()),
            ])}
          </span>
        </div>
      </div>
    );
  }

  if (level === null) return null;

  const formattedLevel = level.toLocaleString(getCurrentLanguage(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const label = translate("playerLevel.label", [formattedLevel]);

  return (
    <span className="playerLevel">
      <span className="playerLevel__badge" aria-label={label}>
        {formattedLevel}
      </span>
    </span>
  );
}

export function PlayerLevelInfoButton() {
  return (
    <details className="playerLevelInfo">
      <summary
        className="playerLevelInfo__button"
        aria-label={translate("playerLevel.howItWorks")}
        title={translate("playerLevel.howItWorks")}
      >
        <Info size={16} strokeWidth={2.3} aria-hidden="true" />
      </summary>
      <div className="playerLevelInfo__popover">
        <strong>{translate("playerLevel.howItWorks")}</strong>
        <p>{translate("playerLevel.calculation")}</p>
        <p className="playerLevelInfo__formula">
          {translate("playerLevel.formula")}
        </p>
        <p>{translate("playerLevel.updates")}</p>
        <p>{translate("playerLevel.results")}</p>
      </div>
    </details>
  );
}
