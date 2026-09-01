import { translate } from "../../../i18n/translate";
import { StatsScreenEmpty } from "./StatsScreenParts";
import { useStatsScreenContext } from "../context/StatsScreenContext";
import { StatsOverview } from "./StatsOverview";
import { StatsMetaPanels } from "./StatsMetaPanels";

export function StatsReport() {
  const { primaryReport, activeKind } = useStatsScreenContext();
  if (!primaryReport) {
    return (
      <StatsScreenEmpty
        title={
          activeKind === "players"
            ? translate("copy.noSavedPlayersYet2")
            : translate("copy.noSavedTeamsYet")
        }
        copy={
          activeKind === "players"
            ? "Create a saved player first, then you can analyze and compare them here."
            : "Build a saved team first, then its team-level report will show here."
        }
      />
    );
  }
  return (
    <>
      <StatsOverview />
      <StatsMetaPanels />
    </>
  );
}
