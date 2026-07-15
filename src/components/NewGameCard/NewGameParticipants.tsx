import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useNewGameCardContext } from "./NewGameCardContext";
import { SectionLabel } from "./NewGameAtoms";

import { NewGamePlayers } from "./NewGamePlayers";
import { NewGameTeams } from "./NewGameTeams";
export function NewGameParticipants() {
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
          Participants
        </SectionLabel>{" "}
        <span className="newSessionPlayers__count">{participantCount}</span>
      </div>
      <div
        className="participantModeSwitch"
        role="tablist"
        aria-label="Participant mode"
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
          Individuals
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
          Teams
          {!canAccessTeamsMode ? (
            <span className="participantModeSwitch__badge">Pro</span>
          ) : null}
        </button>
      </div>
      {participantMode === "players" ? <NewGamePlayers /> : <NewGameTeams />}
    </motion.section>
  );
}
