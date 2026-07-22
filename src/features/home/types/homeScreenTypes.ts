import type { ReactNode } from "react";
import type {
  Game,
  GameTeam,
  PlayerProfile,
  QuickScoreValues,
  ScoreDirection,
  TeamMember,
  WinCondition,
} from "../../../types";
import type { NewGameInput } from "../../../components/NewGameCard/NewGameCard";

export type QuickSetup = {
  key: string;
  label: string;
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
  suggestedPlayers: { name: string; avatarColor: string; profileId?: string }[];
  suggestedTeams?: Array<{
    id: string;
    name: string;
    icon?: string;
    members: Array<{ name: string; avatarColor: string; profileId?: string }>;
  }>;
  uses: number;
};

export type QuickSetupFact = {
  key: string;
  label: string;
  icon: ReactNode;
  tone?: "accent" | "default";
};

export type HomeScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  canUseTeams: boolean;
  isAuthenticated: boolean;
  showLocalSessionsHint: boolean;
  pendingLocalSessionsCount: number;
  pendingLocalProfilesCount: number;
  isCreating: boolean;
  presetDraft?: NewGameInput | null;
  presetDraftToken?: number;
  onCreatingChange: (creating: boolean) => void;
  onOpenAuth: () => void;
  onOpenProFeatureAuth: () => void;
  onOpenLocalImport: () => void;
  onOpenProPlan: () => void;
  onDismissLocalSessionsHint: () => void;
  onOpenTeamsTab: (draft: NewGameInput) => void;
  onCreate: (input: NewGameInput) => boolean | Promise<boolean>;
  onStartQuickSetup: (
    input: NewGameInput,
    details: {
      label: string;
      players: { name: string; avatarColor: string }[];
      teams?: Array<{
        id: string;
        name: string;
        icon?: string;
        members: { name: string; avatarColor: string }[];
      }>;
    },
  ) => void | Promise<void>;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onJoinGame: (code: string) => Promise<void>;
  onEnter: (gameId: string) => void;
};
