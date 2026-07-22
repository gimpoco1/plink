import type { NewGameInput } from "../../../components/NewGameCard/NewGameCard";
import type {
  Game,
  GameTeam,
  HomeTab,
  PlayerProfile,
  TeamMember,
} from "../../../types";

export type DashboardScreenProps = {
  games: Game[];
  profiles: PlayerProfile[];
  teams: GameTeam[];
  teamMembers: TeamMember[];
  canUseTeams: boolean;
  isAuthenticated: boolean;
  showLocalSessionsHint: boolean;
  pendingLocalSessionsCount: number;
  pendingLocalProfilesCount: number;
  onDismissLocalSessionsHint: () => void;
  activeTab: HomeTab;
  onActiveTabChange: (tab: HomeTab) => void;
  onOpenAuth: () => void;
  onOpenProFeatureAuth: () => void;
  onOpenLocalImport: () => void;
  onOpenProPlan: () => void;
  onStoreNewGameDraft: (draft: NewGameInput) => void;
  onCreate: (input: NewGameInput) => boolean | Promise<boolean>;
  presetDraft?: NewGameInput | null;
  presetDraftToken?: number;
  presetDraftIntent?: "edit" | "teams-detour" | null;
  openTeamBuilderRequestToken?: number;
  onOpenTeamBuilderRequestHandled?: () => void;
  onStartQuickSetup: (
    input: NewGameInput,
    details: {
      label: string;
      players: { name: string; avatarColor: string }[];
    },
  ) => void | Promise<void>;
  onUpsertProfile: (name: string, avatarColor: string) => PlayerProfile | null;
  onUpdateProfile: (
    id: string,
    updates: Partial<Pick<PlayerProfile, "name" | "avatarColor">>,
  ) => void;
  onDeleteProfile: (id: string) => void;
  onCreateTeam: (name: string, icon?: string) => GameTeam | null;
  onTeamCreated?: (team: GameTeam) => void;
  onUpdateTeam: (
    id: string,
    updates: Partial<Pick<GameTeam, "name" | "icon">>,
  ) => void;
  onDeleteTeam: (id: string) => void;
  onToggleTeamMember: (teamId: string, profileId: string) => void;
  onJoinGame: (code: string) => Promise<void>;
  onDuplicate: (gameId: string) => void;
  onRename: (gameId: string) => void;
  onEnter: (gameId: string) => void;
  onDelete: (gameId: string) => void;
};
