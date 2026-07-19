import type {
  Game,
  QuickScoreValues,
  ScoreDirection,
  WinCondition,
} from "../../types";

export type GameSettingsDialogHandle = {
  open: () => void;
  close: () => void;
};

export type GameSettingsDialogProps = {
  game: Game;
  isAuthenticated: boolean;
  onOpenAuth?: () => void;
  onAddPlayer?: () => void;
  onSave: (input: {
    name: string;
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
  }) => void;
};
