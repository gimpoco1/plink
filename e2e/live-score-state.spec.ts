import { test, expect } from "@playwright/test";
import type { Game, LiveScoreLocalAction } from "../src/types";
import { selectLiveScoreGame } from "../src/features/live-score/selectLiveScoreGame";
import { applyLocalLiveScoreActions } from "../src/features/live-score/applyLocalLiveScoreActions";

function createGame(id: string, createdAt: number): Game {
  return {
    id, createdAt, updatedAt: createdAt, name: id,
    collaboratorsCanManage: false, participantMode: "players",
    scoreDirection: "up", startingScore: 0, targetScore: 2,
    winCondition: "reach_target", winByTwo: false, manualEndOnly: false,
    timerEnabled: false, toolsEnabled: false, quickScoreValues: [1, 2],
    timerMode: "stopwatch", timerSeconds: 300, teams: [], scoreHistory: [],
    players: ["Alice", "Bob"].map((name) => ({
      id: name, name, score: 0, createdAt, reachedAt: createdAt, avatarColor: "#9fbe38",
    })),
  };
}

function createAction(id: string, createdAt: number): LiveScoreLocalAction {
  return { id, createdAt, gameId: "local", ownerKey: "guest", playerId: "Alice", delta: 1 };
}

test("latest private or guest game is selected ahead of an older shared game", () => {
  const shared = { ...createGame("shared", 1), isShared: true };
  const local = createGame("local", 2);
  const finished = { ...createGame("finished", 3), endedAt: 4 };
  expect(selectLiveScoreGame([shared, local, finished])?.id).toBe("local");
  expect(selectLiveScoreGame([shared, { ...local, ownerId: "account" }])?.id).toBe("local");
});

test("a game already at its target is excluded even without an ended timestamp", () => {
  const active = createGame("active", 1);
  const completed = createGame("completed", 2);
  completed.players[0].score = completed.targetScore;
  expect(selectLiveScoreGame([active, completed])?.id).toBe(active.id);
  expect(selectLiveScoreGame([{ ...completed, manualEndOnly: true }])?.id).toBe(completed.id);
});

test("local Lock Screen actions restore scores, history and completion exactly once", () => {
  const game = createGame("local", 1);
  const actions = [createAction("first", 10), createAction("second", 11)];
  const restored = applyLocalLiveScoreActions([game], actions);
  expect(restored[0].players[0].score).toBe(2);
  expect(restored[0].scoreHistory.map((entry) => entry.id)).toEqual(["second", "first"]);
  expect(restored[0].endedAt).toBe(11);
  expect(applyLocalLiveScoreActions(restored, actions)).toEqual(restored);
  expect(game.players[0].score).toBe(0);
  expect(selectLiveScoreGame(restored)).toBeNull();
});

test("three-player activities select and restore the third player's score", () => {
  const pair = createGame("local", 1);
  const third = { ...pair.players[0], id: "Cara", name: "Cara" };
  const game = { ...pair, players: [...pair.players, third] };
  expect(selectLiveScoreGame([game])?.players).toHaveLength(3);
  const restored = applyLocalLiveScoreActions([game], [
    { ...createAction("third-score", 10), playerId: third.id },
  ]);
  expect(restored[0].players.map((player) => player.score)).toEqual([0, 0, 1]);
  expect(restored[0].scoreHistory[0].playerId).toBe(third.id);
  expect(selectLiveScoreGame([{ ...game, players: [...game.players, { ...third, id: "fourth" }] }])).toBeNull();
});

test("restored countdown scores respect the target and win-by-two games wait for the lead", () => {
  const countdown: Game = { ...createGame("local", 1), winCondition: "reach_zero", targetScore: 0,
    players: createGame("local", 1).players.map((player) => ({ ...player, score: 1 })) };
  const action = { ...createAction("subtract", 10), delta: -1 };
  expect(applyLocalLiveScoreActions([countdown], [action])[0].endedAt).toBe(10);
  const winByTwo = { ...createGame("local", 1), winByTwo: true,
    players: createGame("local", 1).players.map((player) => ({ ...player, score: 1 })) };
  expect(applyLocalLiveScoreActions([winByTwo], [createAction("add", 10)])[0].endedAt).toBeUndefined();
});

test("three-player lowest-wins restoration uses the two lowest scores for win-by-two", () => {
  const game = createGame("local", 1);
  const lowest: Game = {
    ...game,
    targetScore: 5,
    winCondition: "lowest",
    winByTwo: true,
    players: [
      { ...game.players[0], score: 4 },
      { ...game.players[1], score: 0 },
      { ...game.players[1], id: "Cara", name: "Cara", score: 1 },
    ],
  };
  const restored = applyLocalLiveScoreActions([lowest], [createAction("at-target", 10)]);
  expect(restored[0].endedAt).toBeUndefined();
  const finished = applyLocalLiveScoreActions(restored, [
    { ...createAction("lead-two", 11), playerId: "Cara" },
  ]);
  expect(finished[0].endedAt).toBe(11);
});
