import type { RefObject } from "react";
import type { ManagePlayersDialogHandle } from "../../../components/ManagePlayersDialog/ManagePlayersDialog";
import type {
  Game,
  GameTeam,
  Player,
  PlayerProfile,
  TeamMember,
} from "../../../types";
import type { ProfileStats, TeamStats } from "../../../utils/profileStats";

export type GameScreenProps = {
  game: Game;
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  isAuthenticated: boolean;
  canUseTeams: boolean;
  canManageGame: boolean;
  canManageLifecycle: boolean;
  managePlayersDialogRef: RefObject<ManagePlayersDialogHandle>;
  pulseById: Record<string, "pos" | "neg" | undefined>;
  onTriggerPulse: (playerId: string, delta: number) => void;
  onDeleteProfile: (profileId: string) => void;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onUpsertLocalPlayer: (
    name: string,
    avatarColor: string,
  ) => PlayerProfile | null;
  onUpdateProfile: (
    profileId: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
  onStartGame: (
    profileIds: string[],
    newPlayers: Array<{
      name: string;
      avatarColor: string;
      saveForLater: boolean;
    }>,
  ) => void;
  onUpdateScore: (
    playerId: string,
    delta: number,
  ) => boolean | Promise<boolean>;
  onDeletePlayer: (playerId: string) => Promise<void> | void;
  onMergePlayers?: (
    linkedPlayerId: string,
    rosterPlayerId: string,
  ) => Promise<void> | void;
  onUpdatePlayer: (
    playerId: string,
    updates: Partial<
      Pick<Player, "name" | "avatarColor" | "profileId" | "teamId">
    >,
  ) => void;
  onCreateTeam: (
    name: string,
    icon?: string,
    members?: PlayerProfile[],
  ) => GameTeam | null;
  onDeleteTeam: (teamId: string, teamName: string) => Promise<void> | void;
  onDeleteSavedTeam: (teamId: string, teamName: string) => Promise<void> | void;
  onOpenTeamsTab: () => void;
  onInviteOthers?: () => void;
  winnerStats: ProfileStats | TeamStats | null;
  isLatestCompletedGame: boolean;
  onReplayGame: () => void;
  onBackToHome: () => void;
  onEndGame: () => void;
};
