import { test, expect } from "./fixtures";
import { account } from "./env";
import { check } from "./backend";
import { createGame, navigate, progress, savedPlayer, score } from "./helpers";
import { gameAction } from "../helpers";

async function joinOwnerGame(
  owner: import("@playwright/test").Page,
  member: import("@playwright/test").Page,
) {
  await gameAction(owner, "Invite players");
  const codeLocator = owner
    .getByRole("dialog")
    .locator(".gameSharingDialog__code");
  await expect(codeLocator).toHaveText(
    /^(?:[A-Z]{3}\d{2}|[A-Z]{2}\d{2}|[A-F0-9]{8})$/,
  );
  const code = (await codeLocator.innerText()).trim();
  await owner
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await navigate(member, "Home");
  await member.getByRole("button", { name: /Have an invitation code/ }).click();
  await member
    .getByRole("textbox", { name: "Invitation code", exact: true })
    .fill(code);
  await member
    .getByRole("dialog")
    .getByRole("button", { name: "Join game", exact: true })
    .click();
}

test("hosted sign-in creates the account player and saved players load in a fresh browser", async ({
  hosted,
}) => {
  const page = await hosted.open("owner");
  await savedPlayer(page, "Cloud Player");
  await expect
    .poll(async () => {
      const result = await hosted.owner
        .from("player_profiles")
        .select("name")
        .eq("user_id", account("owner").id)
        .eq("name", "Cloud Player");
      check(result.error, "Read saved player through RLS");
      return result.data?.length;
    })
    .toBe(1);
  const fresh = await hosted.open("owner");
  await navigate(fresh, "Players");
  await expect(
    fresh.locator(".profileCard").filter({ hasText: "Cloud Player" }),
  ).toBeVisible();
  await fresh.reload();
  await expect(
    fresh.getByRole("button", { name: "Account", exact: true }),
  ).toBeVisible();
  await expect(
    fresh.locator(".profileCard").filter({ hasText: "Cloud Player" }),
  ).toBeVisible();
});

test("saved teams and memberships survive a fresh browser", async ({
  hosted,
}) => {
  const page = await hosted.open("owner");
  await savedPlayer(page, "Cloud Teammate");
  await page.getByRole("tab", { name: "Teams", exact: true }).click();
  await page.getByRole("button", { name: "New Team", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Team name", exact: true })
    .fill("Cloud Aces");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Add players", exact: true }).click();
  await page
    .getByRole("button", { name: "Cloud Teammate", exact: true })
    .click();
  await page.getByRole("button", { name: "Create team", exact: true }).click();
  await expect
    .poll(async () => {
      const result = await hosted.owner
        .from("teams")
        .select("name,team_members(profile_id)")
        .eq("user_id", account("owner").id)
        .eq("name", "Cloud Aces");
      check(result.error, "Read saved team through RLS");
      return result.data?.[0]?.team_members.length;
    })
    .toBe(1);
  const fresh = await hosted.open("owner");
  await navigate(fresh, "Players");
  await fresh.getByRole("tab", { name: "Teams", exact: true }).click();
  await expect(fresh.getByText("Cloud Aces", { exact: true })).toBeVisible();
  await expect(
    fresh.getByText("Cloud Teammate", { exact: true }),
  ).toBeVisible();
});

test("cloud games restore scores and completed games update saved-player stats", async ({
  hosted,
}) => {
  const page = await hosted.open("owner");
  await createGame(page, "Cloud Match", 5);
  await score(page, "E2e Owner (You)", 3);
  await expect
    .poll(async () => {
      const result = await hosted.owner
        .from("games")
        .select("players")
        .eq("user_id", account("owner").id)
        .eq("name", "CLOUD MATCH")
        .single();
      check(result.error, "Read cloud score");
      return result.data!.players.find(
        (p: { name: string }) => p.name === "E2e Owner",
      )?.score;
    })
    .toBe(3);
  const fresh = await hosted.open("owner");
  await navigate(fresh, "Sessions");
  await fresh
    .getByRole("button", { name: "Open CLOUD MATCH", exact: true })
    .click();
  await expect(progress(fresh, "E2e Owner (You)")).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
  await score(fresh, "E2e Owner (You)", 2);
  await expect(fresh.getByRole("dialog", { name: /E2e Owner/ })).toBeVisible();
  await fresh
    .getByRole("button", { name: "Back to sessions", exact: true })
    .click();
  const statsBrowser = await hosted.open("owner");
  await navigate(statsBrowser, "Stats");
  const wins = statsBrowser
    .locator(".statsMetricCard")
    .filter({ has: statsBrowser.getByText("Wins", { exact: true }) });
  await expect(wins.locator("strong")).toHaveText("1");
  const rate = statsBrowser
    .locator(".statsMetricCard")
    .filter({ has: statsBrowser.getByText("Win rate", { exact: true }) });
  await expect(rate.locator("strong")).toHaveText("100%");
});

test("server ratings drive the level UI and rebuild after game deletion", async ({
  hosted,
}) => {
  const page = await hosted.open("owner");
  const member = await hosted.open("member");
  await createGame(page, "Rating Match", 5);
  await joinOwnerGame(page, member);
  await score(page, "E2e Owner (You)", 5);

  const celebration = page.getByRole("dialog", { name: /E2e Owner/ });
  await expect(celebration.locator(".winFx__levelChange")).toHaveText("5.5");

  const profileResult = await hosted.owner
    .from("player_profiles")
    .select("id")
    .eq("user_id", account("owner").id)
    .eq("is_account_player", true)
    .single();
  check(profileResult.error, "Read account player for rating assertion");
  const profileId = profileResult.data!.id as string;

  await expect
    .poll(async () => {
      const result = await hosted.owner
        .from("player_ratings")
        .select("rating,rated_games,wins")
        .eq("profile_id", profileId)
        .single();
      check(result.error, "Read server player rating");
      return {
        level: Math.round(Number(result.data!.rating) * 10) / 10,
        games: result.data!.rated_games,
        wins: result.data!.wins,
      };
    })
    .toEqual({ level: 5.5, games: 1, wins: 1 });

  const playersPage = await hosted.open("owner");
  await navigate(playersPage, "Players");
  const playerCard = playersPage
    .locator(".profileCard")
    .filter({ hasText: "E2e Owner" });
  await expect(playerCard.getByText("Level 5.5", { exact: true })).toBeVisible();
  await playerCard.getByText("Sessions", { exact: true }).click();
  const ratingSession = playerCard
    .locator(".profileCard__gameResult")
    .filter({ hasText: "RATING MATCH" });
  await expect(ratingSession.locator(".profileCard__ratingChange")).toContainText(
    "Against level 5.0",
  );
  await expect(ratingSession.locator(".profileCard__ratingLevel")).toHaveText(
    "5.5",
  );

  const deleteResult = await hosted.owner
    .from("games")
    .delete()
    .eq("user_id", account("owner").id)
    .eq("name", "RATING MATCH");
  check(deleteResult.error, "Delete rated game through RLS");
  await expect
    .poll(async () => {
      const result = await hosted.owner
        .from("player_ratings")
        .select("profile_id", { count: "exact", head: true })
        .eq("profile_id", profileId);
      check(result.error, "Verify rating rebuild after deletion");
      return result.count;
    })
    .toBe(0);
});

test("a guest winner records the account players' match without changing their levels", async ({
  hosted,
}) => {
  const owner = await hosted.open("owner");
  const member = await hosted.open("member");
  await createGame(owner, "Guest Winner", 5);
  await joinOwnerGame(owner, member);
  await score(owner, "Opponent", 5);
  await expect(owner.getByRole("dialog", { name: /Opponent/ })).toBeVisible();

  const ownerProfile = await hosted.owner
    .from("player_profiles")
    .select("id")
    .eq("user_id", account("owner").id)
    .eq("is_account_player", true)
    .single();
  check(ownerProfile.error, "Read owner account player for guest-winner ratings");
  const memberProfile = await hosted.member
    .from("player_profiles")
    .select("id")
    .eq("user_id", account("member").id)
    .eq("is_account_player", true)
    .single();
  check(memberProfile.error, "Read member account player for guest-winner ratings");
  const profileIds = [ownerProfile.data!.id, memberProfile.data!.id] as string[];

  await expect
    .poll(async () => {
      const result = await hosted.owner
        .from("player_ratings")
        .select("profile_id,rating,rated_games,wins")
        .in("profile_id", profileIds);
      check(result.error, "Read ratings after guest win");
      return result.data
        ?.map((rating) => ({
          level: Number(rating.rating),
          games: rating.rated_games,
          wins: rating.wins,
        }))
        .sort((a, b) => a.level - b.level);
    })
    .toEqual([
      { level: 5, games: 1, wins: 0 },
      { level: 5, games: 1, wins: 0 },
    ]);
});

test("an invited player shows their account rating to the game owner", async ({
  hosted,
}) => {
  const owner = await hosted.open("owner");
  const member = await hosted.open("member");
  await createGame(owner, "Member Rating", 5);
  await joinOwnerGame(owner, member);
  await score(member, "E2e Member (You)", 5);
  await expect(
    member.getByRole("dialog").locator(".winFx__levelChange"),
  ).toHaveText("5.5");
  await member
    .getByRole("button", { name: "Back to sessions", exact: true })
    .click();
  await owner
    .getByRole("button", { name: "Back to sessions", exact: true })
    .click();

  await createGame(owner, "Rated Invite", 10);
  await joinOwnerGame(owner, member);

  await expect(
    owner
      .locator(".playerCard")
      .filter({ hasText: "E2e Member" })
      .locator(".playerLevel__badge"),
  ).toHaveText("5.5");
});

test("two accounts join a shared game and receive score updates in both directions without reloading", async ({
  hosted,
}) => {
  const owner = await hosted.open("owner");
  const member = await hosted.open("member");
  await createGame(owner, "Realtime Match", 100);
  await gameAction(owner, "Invite players");
  const codeLocator = owner
    .getByRole("dialog")
    .locator(".gameSharingDialog__code");
  await expect(codeLocator).toHaveText(
    /^(?:[A-Z]{3}\d{2}|[A-Z]{2}\d{2}|[A-F0-9]{8})$/,
  );
  const code = (await codeLocator.innerText()).trim();
  await owner
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await member.getByRole("button", { name: /Have an invitation code/ }).click();
  await member
    .getByRole("textbox", { name: "Invitation code", exact: true })
    .fill(code);
  await member
    .getByRole("dialog")
    .getByRole("button", { name: "Join game", exact: true })
    .click();
  await expect(progress(owner, "E2e Member")).toBeVisible();
  await expect(progress(member, "E2e Member (You)")).toBeVisible();
  // Observe live UI updates; no reload, navigation, or API-driven refresh between actions.
  await score(owner, "E2e Owner (You)", 3);
  await expect(progress(member, "E2e Owner")).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
  await score(member, "E2e Member (You)", 2);
  await expect(progress(owner, "E2e Member")).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  const result = await hosted.owner
    .from("games")
    .select("players")
    .eq("name", "REALTIME MATCH")
    .single();
  check(result.error, "Verify shared scores in database");
  expect(
    result.data!.players.map((p: { score: number }) => p.score).sort(),
  ).toEqual([0, 2, 3]);
});
