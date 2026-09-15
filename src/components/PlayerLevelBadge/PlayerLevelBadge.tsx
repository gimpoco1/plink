import { getCurrentLanguage, translate } from "../../i18n/translate";
import { Info } from "lucide-react";
import { usePlayerRatingsContext } from "../../features/playerRatings/PlayerRatingsContext";
import "./PlayerLevelBadge.css";

type Props = {
  profileId?: string;
  variant?: "compact" | "summary";
};

function formatLevel(level: number) {
  return level.toLocaleString(getCurrentLanguage(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function PlayerLevelBadge({ profileId, variant = "compact" }: Props) {
  const { isAuthenticated, loading, ratingsByProfileId } =
    usePlayerRatingsContext();
  if (!isAuthenticated || loading || !profileId) return null;

  const rating = ratingsByProfileId.get(profileId);
  if (variant === "summary") {
    if (!rating) {
      return (
        <div className="playerLevelCard playerLevelSummary--unrated">
          <div className="playerLevelCard__heading">
            <strong>{translate("playerLevel.unrated")}</strong>
          </div>
          <p>{translate("playerLevel.startHint")}</p>
        </div>
      );
    }

    const level = formatLevel(rating.level);
    return (
      <div className="playerLevelCard">
        <div className="playerLevelCard__heading">
          <strong>{translate("playerLevel.label", [level])}</strong>
          <span>{translate("playerLevel.outOfTen")}</span>
        </div>
        <div className="playerLevelCard__meta">
          <span>{translate("playerLevel.winRateValue", [rating.winRate])}</span>
          <span aria-hidden="true">·</span>
          <span>
            {translate("playerLevel.ratedGamesValue", [
              rating.ratedGames.toLocaleString(getCurrentLanguage()),
            ])}
          </span>
        </div>
      </div>
    );
  }

  if (!rating) return null;
  const level = formatLevel(rating.level);
  return (
    <span className="playerLevel">
      <span className="playerLevel__badge" aria-label={translate("playerLevel.label", [level])}>
        {level}
      </span>
    </span>
  );
}

export function PlayerLevelInfoButton() {
  const { isAuthenticated } = usePlayerRatingsContext();
  if (!isAuthenticated) return null;
  return (
    <details className="playerLevelInfo">
      <summary className="playerLevelInfo__button" aria-label={translate("playerLevel.howItWorks")} title={translate("playerLevel.howItWorks")}>
        <Info size={16} strokeWidth={2.3} aria-hidden="true" />
      </summary>
      <div className="playerLevelInfo__popover">
        <strong>{translate("playerLevel.howItWorks")}</strong>
        <p>{translate("playerLevel.calculation")}</p>
        <p className="playerLevelInfo__formula">{translate("playerLevel.formula")}</p>
        <p>{translate("playerLevel.updates")}</p>
        <p>{translate("playerLevel.results")}</p>
      </div>
    </details>
  );
}
