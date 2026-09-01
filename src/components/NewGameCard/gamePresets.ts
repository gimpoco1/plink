import { translate } from "../../i18n/translate";
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
    category: translate("preset.cards"),
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
    description: translate("preset.classicItalianCardGameCommonlyPlayedTo31"),
    rulesNote:
      translate("preset.tressetteScoringCanVaryByTableButMatchesAreCommonlyPlayedTo"),
    rulesSummary: [
      translate("preset.playersOrTeamsScorePointsFromCardsWonInEachHand"),
      translate("preset.useYourUsualTableScoringForCardsDeclarationsAndBonusPoints"),
      translate("preset.inPlinkAddEachPlayerOrTeamSPointsAfterEveryHand"),
    ],
  },
  {
    id: "briscola",
    name: "Briscola",
    category: translate("preset.cards"),
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
    description: translate("preset.bestOf7StyleMatchAdd1PointForEachHandWon"),
    rulesNote:
      translate("preset.inBriscolaEachHandIsUsuallyDecidedByCardPointsWith61"),
    rulesSummary: [
      translate("preset.aDeckHandHas120TotalCardPoints"),
      translate("preset.thePlayerOrTeamWithMoreThan60CardPointsWinsThe"),
      translate("preset.thisPresetTracksHandsWonAdd1PointInPlinkToThe"),
    ],
  },
  {
    id: "scopa",
    name: "Scopa",
    category: translate("preset.cards"),
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
    description: translate("preset.bestOf7StyleMatchAdd1PointForEachHandWon"),
    rulesNote:
      translate("preset.scopaPointsAreUsuallyCountedAtTheEndOfEachHandUsing"),
    rulesSummary: [
      translate("preset.commonScoringIncludesCardsCoinsSettebelloPrimieraAndScopas"),
      translate("preset.decideTheHandWinnerUsingYourUsualTableRules"),
      translate("preset.thisPresetTracksHandsWonAdd1PointInPlinkToThe"),
    ],
  },
  {
    id: "burraco",
    name: "Burraco",
    category: translate("preset.cards"),
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
    description: translate("preset.longerCardMatchPresetWithTheStandardHighTarget"),
    rulesNote:
      translate("preset.burracoScoringIsCumulativeAndIsCommonlyPlayedToAHighTarget"),
    rulesSummary: [
      translate("preset.countEachSideSPointsAfterEveryDealUsingYourUsualBurraco"),
      translate("preset.bonusesAndPenaltiesCanVaryByTableOrRuleSet"),
      translate("preset.inPlinkAddEachSideSTotalAfterEachDeal"),
    ],
  },
  {
    id: "rummy-500",
    name: "Rummy 500",
    category: translate("preset.cards"),
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
    description: translate("preset.aFamiliarPointsTargetForRummyStyleRounds"),
    rulesNote:
      translate("preset.rummy500IsCommonlyPlayedAsACumulativeRaceTo500Points"),
    rulesSummary: [
      translate("preset.playersScoreFromMeldsAndCardsLaidOff"),
      translate("preset.pointsLeftInHandAreUsuallySubtracted"),
      translate("preset.inPlinkAddEachPlayerSNetScoreAfterEveryRound"),
    ],
  },
  {
    id: "uno",
    name: "UNO",
    category: translate("preset.cards"),
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
    description: translate("preset.trackCumulativePointsAcrossHands"),
    rulesNote:
      translate("preset.unoIsOftenPlayedByScoringOpponentsRemainingCardsAfterSomeoneGoes"),
    rulesSummary: [
      translate("preset.whenAPlayerGoesOutCountPointsFromOpponentsRemainingCards"),
      translate("preset.numberCardsCountFaceValueActionCardValuesDependOnYourRule"),
      translate("preset.inPlinkAddTheHandScoreToThePlayerWhoWentOut"),
    ],
  },
  {
    id: "darts-501",
    name: "Darts 501",
    category: translate("preset.pubGames"),
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
    description: translate("preset.countDownFrom501LowestScoreWins"),
    rulesNote:
      translate("preset.darts501StartsEachPlayerAt501AndCountsDownToExactly"),
    rulesSummary: [
      translate("preset.startEachPlayerAt501"),
      translate("preset.subtractThePointsScoredEachTurn"),
      translate("preset.theFirstPlayerToReachExactly0WinsUsingYourUsualDouble"),
    ],
  },
  {
    id: "cornhole",
    name: "Cornhole",
    category: translate("preset.outdoor"),
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
    description: translate("preset.simpleRaceTo21ForCasualMatches"),
    rulesNote:
      translate("preset.cornholeIsCommonlyPlayedAsARaceTo21UsingCancellationScoring"),
    rulesSummary: [
      translate("preset.bagsOnTheBoardAndInTheHoleScoreByYourUsual"),
      translate("preset.onlyTheDifferenceBetweenPlayersOrTeamsUsuallyCountsEachRound"),
      translate("preset.inPlinkAddTheNetRoundPointsToTheRoundWinner"),
    ],
  },
  {
    id: "table-tennis",
    name: "Table Tennis",
    category: translate("preset.sports"),
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
    description: translate("preset.fastGamePresetForPointByPointScoring"),
    rulesNote: translate("preset.tableTennisGamesAreCommonlyPlayedTo11Points"),
    rulesSummary: [
      translate("preset.add1PointToTheRallyWinner"),
      translate("preset.aPlayerUsuallyNeedsToWinBy2Points"),
      translate("preset.ifYouEnforceWinBy2ContinueScoringPast11UntilSomeone"),
    ],
  },
  {
    id: "volleyball",
    name: "Volleyball",
    category: translate("preset.sports"),
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
    description: translate("preset.standardSetTargetForTeamScoreTracking"),
    rulesNote: translate("preset.volleyballSetsAreCommonlyPlayedTo25Points"),
    rulesSummary: [
      translate("preset.add1PointToTheRallyWinner"),
      translate("preset.aTeamUsuallyNeedsToWinBy2Points"),
      translate("preset.ifYouEnforceWinBy2ContinueScoringPast25UntilSomeone"),
    ],
  },
];
