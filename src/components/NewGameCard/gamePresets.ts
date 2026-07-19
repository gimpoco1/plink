import type { QuickScoreValues } from "../../types";

export type GamePreset = {
  id: string;
  name: string;
  category: string;
  scoreDirection: "up" | "down";
  startingScore: number;
  targetScore: number;
  winCondition: "reach_target" | "reach_zero" | "lowest";
  winByTwo: boolean;
  manualEndOnly: boolean;
  timerEnabled: boolean;
  quickScoreValues: QuickScoreValues;
  timerMode: "countdown" | "stopwatch";
  timerSeconds: number;
  description: string;
  rulesNote: string;
  rulesSummary: string[];
};

export const GAME_PRESETS: GamePreset[] = [
  {
    id: "tressette",
    name: "Tressette",
    category: "Cards",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 31,
    winCondition: "reach_target",
    winByTwo: false,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [1, 2],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Classic Italian card game, commonly played to 31.",
    rulesNote:
      "Tressette scoring can vary by table, but matches are commonly played to 31 points.",
    rulesSummary: [
      "Players or teams score points from cards won in each hand.",
      "Use your usual table scoring for cards, declarations, and bonus points.",
      "In Plink, add each player or team's points after every hand.",
    ],
  },
  {
    id: "briscola",
    name: "Briscola",
    category: "Cards",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 4,
    winCondition: "reach_target",
    winByTwo: false,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [1, 2],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Best of 7 style match. Add 1 point for each hand won.",
    rulesNote:
      "In Briscola, each hand is usually decided by card points, with 61 points winning the hand.",
    rulesSummary: [
      "A deck hand has 120 total card points.",
      "The player or team with more than 60 card points wins the hand.",
      "This preset tracks hands won: add 1 point in Plink to the hand winner.",
    ],
  },
  {
    id: "scopa",
    name: "Scopa",
    category: "Cards",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 4,
    winCondition: "reach_target",
    winByTwo: false,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [1, 2],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Best of 7 style match. Add 1 point for each hand won.",
    rulesNote:
      "Scopa points are usually counted at the end of each hand using your table's scoring rules.",
    rulesSummary: [
      "Common scoring includes cards, coins, settebello, primiera, and scopas.",
      "Decide the hand winner using your usual table rules.",
      "This preset tracks hands won: add 1 point in Plink to the hand winner.",
    ],
  },
  {
    id: "burraco",
    name: "Burraco",
    category: "Cards",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 2005,
    winCondition: "reach_target",
    winByTwo: false,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [50, 100],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Longer card match preset with the standard high target.",
    rulesNote:
      "Burraco scoring is cumulative and is commonly played to a high target such as 2005.",
    rulesSummary: [
      "Count each side's points after every deal using your usual Burraco scoring.",
      "Bonuses and penalties can vary by table or rule set.",
      "In Plink, add each side's total after each deal.",
    ],
  },
  {
    id: "rummy-500",
    name: "Rummy 500",
    category: "Cards",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 500,
    winCondition: "reach_target",
    winByTwo: false,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [10, 50],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "A familiar points target for Rummy-style rounds.",
    rulesNote:
      "Rummy 500 is commonly played as a cumulative race to 500 points.",
    rulesSummary: [
      "Players score from melds and cards laid off.",
      "Points left in hand are usually subtracted.",
      "In Plink, add each player's net score after every round.",
    ],
  },
  {
    id: "uno",
    name: "UNO",
    category: "Cards",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 500,
    winCondition: "reach_target",
    winByTwo: false,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [10, 50],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Track cumulative points across hands.",
    rulesNote:
      "UNO is often played by scoring opponents' remaining cards after someone goes out.",
    rulesSummary: [
      "When a player goes out, count points from opponents' remaining cards.",
      "Number cards count face value; action card values depend on your rule set.",
      "In Plink, add the hand score to the player who went out.",
    ],
  },
  {
    id: "darts-501",
    name: "Darts 501",
    category: "Pub games",
    scoreDirection: "down",
    startingScore: 501,
    targetScore: 0,
    winCondition: "reach_zero",
    winByTwo: false,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [20, 60],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Count down from 501, lowest score wins.",
    rulesNote:
      "Darts 501 starts each player at 501 and counts down to exactly zero.",
    rulesSummary: [
      "Start each player at 501.",
      "Subtract the points scored each turn.",
      "The first player to reach exactly 0 wins, using your usual double-out rule if needed.",
    ],
  },
  {
    id: "cornhole",
    name: "Cornhole",
    category: "Outdoor",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 21,
    winCondition: "reach_target",
    winByTwo: true,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [1, 2],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Simple race to 21 for casual matches.",
    rulesNote:
      "Cornhole is commonly played as a race to 21 using cancellation scoring.",
    rulesSummary: [
      "Bags on the board and in the hole score by your usual rules.",
      "Only the difference between players or teams usually counts each round.",
      "In Plink, add the net round points to the round winner.",
    ],
  },
  {
    id: "table-tennis",
    name: "Table Tennis",
    category: "Sports",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 11,
    winCondition: "reach_target",
    winByTwo: true,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [1, 2],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Fast game preset for point-by-point scoring.",
    rulesNote: "Table tennis games are commonly played to 11 points.",
    rulesSummary: [
      "Add 1 point to the rally winner.",
      "A player usually needs to win by 2 points.",
      "If you enforce win-by-2, continue scoring past 11 until someone leads by 2.",
    ],
  },
  {
    id: "volleyball",
    name: "Volleyball",
    category: "Sports",
    scoreDirection: "up",
    startingScore: 0,
    targetScore: 25,
    winCondition: "reach_target",
    winByTwo: true,
    manualEndOnly: false,
    timerEnabled: false,
    quickScoreValues: [1, 2],
    timerMode: "countdown",
    timerSeconds: 300,
    description: "Standard set target for team score tracking.",
    rulesNote: "Volleyball sets are commonly played to 25 points.",
    rulesSummary: [
      "Add 1 point to the rally winner.",
      "A team usually needs to win by 2 points.",
      "If you enforce win-by-2, continue scoring past 25 until someone leads by 2.",
    ],
  },
];
