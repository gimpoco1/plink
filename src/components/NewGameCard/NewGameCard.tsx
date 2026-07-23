import type {
  GameTeam,
  PastLinkedPlayer,
  PlayerProfile,
  QuickScoreValues,
  ScoreDirection,
  TeamMember,
  WinCondition,
} from "../../types";
import { useNewGameCardModel } from "./useNewGameCardModel";
import "./NewGameCard.css";

export type NewGameInput = {
  name: string;
  participantMode: "players" | "teams";
  scoreDirection: ScoreDirection;
  startingScore: number;
  targetScore: number;
  winCondition: WinCondition;
  winByTwo: boolean;
  manualEndOnly: boolean;
  timerEnabled: boolean;
  diceEnabled: boolean;
  quickScoreValues: QuickScoreValues;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
  initialPlayers: Array<{
    name: string;
    avatarColor: string;
    profileId?: string;
    invitedUserId?: string;
  }>;
  initialTeams?: Array<{
    id: string;
    name: string;
    icon?: string;
    members: Array<{ name: string; avatarColor: string; profileId?: string }>;
  }>;
};

export type NewGameCardProps = {
  open: boolean;
  profiles: PlayerProfile[];
  pastInvitedPlayers: PastLinkedPlayer[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  canUseTeams: boolean;
  isAuthenticated: boolean;
  draft?: NewGameInput | null;
  draftToken?: number;
  onOpenChange: (open: boolean) => void;
  onOpenAuth: () => void;
  onOpenProFeatureAuth: () => void;
  onOpenProPlan: () => void;
  onOpenTeamsTab: (draft: NewGameInput) => void;
  onCreate: (input: NewGameInput) => boolean | Promise<boolean>;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
};

import { NewGameCardProvider } from "./NewGameCardContext";
import { NewGamePanel } from "./NewGamePanel";

export function NewGameCard(props: NewGameCardProps) {
  const model = useNewGameCardModel(props);
  return (
    <NewGameCardProvider value={model}>
      <NewGamePanel />
    </NewGameCardProvider>
  );
}
