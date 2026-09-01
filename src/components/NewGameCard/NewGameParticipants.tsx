import { translate } from "../../i18n/translate";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useNewGameCardContext } from "./NewGameCardContext";
import { SectionLabel } from "./NewGameAtoms";
import { useI18n } from "../../i18n/I18nContext";

import { NewGamePlayers } from "./NewGamePlayers";
import { NewGameTeams } from "./NewGameTeams";
export function NewGameParticipants() {
  const { t } = useI18n();
  const {
    participantMode,
    sectionVariants,
    sectionTransition,
    participantCount,
    switchParticipantMode,
    canAccessTeamsMode,
    handleTeamsModePress,
  } = useNewGameCardContext();
  return (
    <motion.section
      className={`newSessionPlayers${
        participantMode === "teams" ? " newSessionPlayers--teams" : ""
      }`}
      variants={sectionVariants}
      transition={sectionTransition}
    >
      <div className="newSessionPlayers__head">
        <SectionLabel icon={<Users size={16} strokeWidth={2.4} />}>
          {t("new.participants")}
        </SectionLabel>{" "}
        <span className="newSessionPlayers__count">{participantCount}</span>
      </div>
      <div
        className="participantModeSwitch"
        role="tablist"
        aria-label={translate("copy.participantMode")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={participantMode === "players"}
          className={`participantModeSwitch__option${
            participantMode === "players"
              ? " participantModeSwitch__option--active"
              : ""
          }`}
          onClick={() => switchParticipantMode("players")}
        >
          {t("new.individuals")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={participantMode === "teams"}
          aria-disabled={!canAccessTeamsMode}
          className={`participantModeSwitch__option${
            participantMode === "teams"
              ? " participantModeSwitch__option--active participantModeSwitch__option--teamsActive"
              : ""
          }${
            !canAccessTeamsMode ? " participantModeSwitch__option--locked" : ""
          }`}
          onClick={handleTeamsModePress}
        >
          {t("tabs.teams")}
          {!canAccessTeamsMode ? (
            <span className="participantModeSwitch__badge">
              {t("common.pro")}
            </span>
          ) : null}
        </button>
      </div>
      {participantMode === "players" ? <NewGamePlayers /> : <NewGameTeams />}
    </motion.section>
  );
}
