import { test, expect } from "./fixtures";
import { addPoints, playerCard } from "./helpers";
import {
  calculatePlayerLevelChange,
  getPlayerLevel,
} from "../src/utils/playerLevel";
import { computeProfileStats } from "../src/utils/profileStats";
import type { Game } from "../src/types";

function game(
  id: string,
  completed = false,
  aliceWins = true,
  order = 1,
): Game {
  return {
    id, name: "Level test", collaboratorsCanManage: false,
    scoreDirection: "up", startingScore: 0, targetScore: 5,
    winCondition: "reach_target", winByTwo: false, manualEndOnly: false,
    timerEnabled: false, diceEnabled: false, quickScoreValues: [1, 2],
    timerMode: "countdown", timerSeconds: 300, teams: [], scoreHistory: [],
    createdAt: order,
    updatedAt: order,
    endedAt: completed ? order : undefined,
    players: ["Alice", "Bob"].map((name, index) => ({
      id: `${id}-${name}`, profileId: name, name, avatarColor: "#6366f1",
      score: completed && (index === 0) === aliceWins ? 5 : 0,
      createdAt: index + 1, reachedAt: index + 1,
    })),
  };
}

test("levels change gradually and reward harder results", () => {
  expect(getPlayerLevel()).toBeNull();
  expect(getPlayerLevel({ level: null })).toBeNull();

  const afterLoss = computeProfileStats([game("loss", true, false, 1)]);
  expect(getPlayerLevel(afterLoss.get("Alice"))).toBe(4.6);

  const afterLossThenWin = computeProfileStats([
    game("loss", true, false, 1),
    game("win", true, true, 2),
  ]);
  expect(getPlayerLevel(afterLossThenWin.get("Alice"))).toBe(5.1);

  const upsetIncrease = calculatePlayerLevelChange(5, 8, 1, 0);
  const expectedWinIncrease = calculatePlayerLevelChange(5, 2, 1, 0);
  expect(upsetIncrease).toBeGreaterThan(expectedWinIncrease);

  const provisionalChange = calculatePlayerLevelChange(5, 5, 1, 0);
  const establishedChange = calculatePlayerLevelChange(5, 5, 1, 24);
  expect(establishedChange).toBeLessThan(provisionalChange);
});

test("player level badges stay compact and update after a win", async ({ page }, testInfo) => {
  await page.addInitScript((games) => {
    localStorage.setItem("plink:guest:games:v1", JSON.stringify(games));
    localStorage.setItem("plink:guest:currentGameId:v1", "active");
    localStorage.setItem("plink:language:v1", "en");
  }, [game("active")]);
  await page.goto("/");
  await page.getByRole("button", { name: "Resume last game", exact: true }).click();
  const alice = playerCard(page, "Alice");
  const bob = playerCard(page, "Bob");
  await expect(alice.locator(".playerLevel__badge")).toHaveCount(0);
  await expect(bob.locator(".playerLevel__badge")).toHaveCount(0);
  await addPoints(page, "Alice", 5);
  const celebration = page.getByRole("dialog");
  await expect(celebration.locator(".winFx__levelChange")).toHaveText("5.5");
  await expect(celebration.locator(".winFx__levelChange")).toHaveAttribute(
    "aria-label",
    "Level increased to 5.5",
  );
  await expect(celebration.locator(".winFx__levelChange")).toHaveClass(
    /winFx__levelChange--up/,
  );
  await expect(celebration.locator(".winFx__levelChange")).toHaveCSS(
    "color",
    "rgb(94, 229, 138)",
  );
  const celebrationName = await celebration.locator(".winFx__name").boundingBox();
  const celebrationLevel = await celebration
    .locator(".winFx__levelChange")
    .boundingBox();
  expect(celebrationName).not.toBeNull();
  expect(celebrationLevel).not.toBeNull();
  expect(celebrationLevel!.x).toBeGreaterThanOrEqual(
    celebrationName!.x + celebrationName!.width,
  );
  expect(
    Math.abs(
      celebrationLevel!.y + celebrationLevel!.height / 2 -
        (celebrationName!.y + celebrationName!.height / 2),
    ),
  ).toBeLessThan(4);
  await celebration.screenshot({
    path: testInfo.outputPath("winner-level-change.png"),
  });
  await celebration.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(alice.locator(".playerLevel__badge")).toHaveText("5.5");
  await expect(bob.locator(".playerLevel__badge")).toHaveText("4.6");
  const trophy = await alice.locator(".winnerMark").boundingBox();
  const name = await alice.locator(".who__name").boundingBox();
  const level = await alice.locator(".playerLevel__badge").boundingBox();
  expect(trophy).not.toBeNull();
  expect(name).not.toBeNull();
  expect(level).not.toBeNull();
  const avatar = await alice.locator(".avatar").boundingBox();
  expect(avatar).not.toBeNull();
  expect(trophy!.y).toBeLessThan(avatar!.y);
  expect(trophy!.y + trophy!.height).toBeGreaterThan(avatar!.y);
  expect(trophy!.x).toBeLessThan(avatar!.x + avatar!.width);
  expect(level!.x).toBeGreaterThanOrEqual(name!.x + name!.width);
  await alice.screenshot({ path: testInfo.outputPath("winner-card.png") });
  const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflowing).toBe(false);
});
