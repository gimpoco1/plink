import { test, expect } from "./fixtures";
import { addPoints, playerCard } from "./helpers";
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

test("guest games never show player levels", async ({ page }, testInfo) => {
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
  await expect(celebration.locator(".winFx__levelChange")).toHaveCount(0);
  await celebration.screenshot({
    path: testInfo.outputPath("winner-level-change.png"),
  });
  await celebration.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(alice.locator(".playerLevel__badge")).toHaveCount(0);
  await expect(bob.locator(".playerLevel__badge")).toHaveCount(0);
  const trophy = await alice.locator(".winnerMark").boundingBox();
  const name = await alice.locator(".who__name").boundingBox();
  expect(trophy).not.toBeNull();
  expect(name).not.toBeNull();
  const avatar = await alice.locator(".avatar").boundingBox();
  expect(avatar).not.toBeNull();
  expect(trophy!.y).toBeLessThan(avatar!.y);
  expect(trophy!.y + trophy!.height).toBeGreaterThan(avatar!.y);
  expect(trophy!.x).toBeLessThan(avatar!.x + avatar!.width);
  await alice.screenshot({ path: testInfo.outputPath("winner-card.png") });
  const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflowing).toBe(false);
});
