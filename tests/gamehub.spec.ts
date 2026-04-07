import { test, expect } from "@playwright/test";

const PLAYER_KEY = "gamehub-player-name";

const TYPING_SAMPLE =
  "The quick brown fox jumps over the lazy dog before the sun rises over Cincinnati.";

test.describe("Game Hub", () => {
  test("landing lists games and developer names", async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(key, "Alex");
    }, PLAYER_KEY);
    await page.goto("/");

    await expect(page.getByTestId("landing")).toBeVisible();
    await expect(page.getByTestId("game-card-rps")).toBeVisible();
    await expect(page.getByTestId("game-card-typing")).toBeVisible();
    await expect(page.getByTestId("developers-section")).toBeVisible();
    await expect(page.getByTestId("developer-riddhi")).toHaveText("Riddhi Mahajan");
    await expect(page.getByTestId("developer-rohit")).toHaveText("Rohit Vijai");
  });

  test("player name is captured on first visit and shown in the header", async ({
    page,
    context,
  }) => {
    await context.addInitScript((key) => {
      localStorage.removeItem(key);
    }, PLAYER_KEY);
    await page.goto("/");

    await expect(page.getByTestId("name-modal")).toBeVisible();
    await page.getByTestId("player-name-input").fill("Jordan");
    await page.getByTestId("player-name-submit").click();

    await expect(page.getByTestId("name-modal")).toBeHidden();
    await expect(page.getByTestId("player-greeting")).toContainText("Jordan");
  });

  test("player name appears on Rock Paper Scissors and Typing screens", async ({
    page,
    context,
  }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(key, "Sam");
    }, PLAYER_KEY);
    await page.goto("/games/rock-paper-scissors");
    await expect(page.getByTestId("player-greeting")).toContainText("Sam");
    await expect(page.getByTestId("rps-player-label")).toContainText("Sam");

    await page.goto("/games/typing-speed");
    await expect(page.getByTestId("player-greeting")).toContainText("Sam");
    await expect(page.getByTestId("typing-player-label")).toContainText("Sam");
  });

  test("Rock Paper Scissors: playing a round updates the board", async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(key, "RPS Tester");
    }, PLAYER_KEY);
    await page.goto("/games/rock-paper-scissors");

    await page.getByTestId("rps-rock").click();
    await expect(page.getByTestId("rps-detail")).toBeVisible();
    const result = page.getByTestId("rps-result");
    await expect(result).not.toHaveText("Choose your move.");

    const playerScore = await page.getByTestId("rps-score-player").textContent();
    const computerScore = await page.getByTestId("rps-score-computer").textContent();
    const p = Number(playerScore);
    const c = Number(computerScore);
    expect(p + c).toBeLessThanOrEqual(1);
  });

  test("Typing Speed Test: start, type, and end early shows a summary", async ({
    page,
    context,
  }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(key, "Typist");
    }, PLAYER_KEY);
    await page.goto("/games/typing-speed");

    await page.getByTestId("typing-start").click();
    await expect(page.getByTestId("typing-timer")).toContainText("s");

    await page.getByTestId("typing-input").fill(TYPING_SAMPLE.slice(0, 12));
    await page.getByTestId("typing-finish-early").click();

    await expect(page.getByTestId("typing-summary")).toBeVisible();
    await expect(page.getByTestId("typing-reset")).toBeVisible();
  });

  test("navigation from home to each game works", async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(key, "Nav");
    }, PLAYER_KEY);
    await page.goto("/");

    await page.getByTestId("game-card-rps").click();
    await expect(page).toHaveURL(/rock-paper-scissors/);
    await expect(page.getByTestId("rps-page")).toBeVisible();

    await page.getByRole("link", { name: "All games" }).click();
    await page.getByTestId("game-card-typing").click();
    await expect(page).toHaveURL(/typing-speed/);
    await expect(page.getByTestId("typing-page")).toBeVisible();
  });
});
