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
    await expect(page.getByTestId("game-card-wordle")).toBeVisible();
    await expect(page.getByTestId("game-card-ttt")).toBeVisible();
    await expect(page.getByTestId("game-card-memory")).toBeVisible();
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

    await page.goto("/games/wordle");
    await expect(page.getByTestId("player-greeting")).toContainText("Sam");
    await expect(page.getByTestId("wordle-player-label")).toContainText("Sam");

    await page.goto("/games/tic-tac-toe");
    await expect(page.getByTestId("player-greeting")).toContainText("Sam");
    await expect(page.getByTestId("ttt-player-label")).toContainText("Sam");

    await page.goto("/games/memory-cards");
    await expect(page.getByTestId("player-greeting")).toContainText("Sam");
    await expect(page.getByTestId("memory-player-label")).toContainText("Sam");
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

  test("Wordle: can submit a valid guess", async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(key, "Wordle Tester");
    }, PLAYER_KEY);
    await page.goto("/games/wordle");

    await page.getByTestId("wordle-input").fill("react");
    await page.getByTestId("wordle-submit").click();

    await expect(page.getByTestId("wordle-grid")).toBeVisible();
    await expect(page.getByText("R").first()).toBeVisible();
  });

  test("Tic Tac Toe: first move updates status", async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(key, "TTT Tester");
    }, PLAYER_KEY);

    // Seed a two-player game so the board is immediately playable without a
    // real network connection.  The mock state is mutated on every PUT so
    // subsequent GET polls return the updated cells.
    const baseState = {
      players: [
        { name: "TTT Tester", mark: "X" },
        { name: "Player 2", mark: "O" },
      ],
      cells: Array(9).fill(null),
      turn: "X",
      winner: null,
      isDraw: false,
      score: { x: 0, o: 0, draws: 0 },
      version: 0,
    };
    let currentState = { ...baseState };

    // Intercept POST /api/rooms (createRoom)
    await page.route("**/api/rooms", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ roomId: "TEST01", gameState: currentState }),
      });
    });

    // Intercept GET and PUT /api/rooms/TEST01 (poll + pushState)
    await page.route("**/api/rooms/TEST01", async (route) => {
      if (route.request().method() === "PUT") {
        const body = JSON.parse(route.request().postData() ?? "{}");
        currentState = body.gameState;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "TEST01", gameState: currentState }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "TEST01", gameState: currentState }),
        });
      }
    });

    await page.goto("/games/tic-tac-toe");

    // Lobby is shown first — click Create Room to enter the game
    await page.getByRole("button", { name: "Create Room" }).click();

    // Board is visible once the room is ready (mock returns 2 players)
    await expect(page.getByTestId("ttt-cell-0")).toBeVisible();
    await page.getByTestId("ttt-cell-0").click();

    await expect(page.getByTestId("ttt-cell-0")).toHaveText("X");
    // After X moves the status should indicate it is now the opponent's turn
    await expect(page.getByTestId("ttt-status")).toContainText("turn");
  });

  test("Memory Cards: can flip cards and increment moves", async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(key, "Memory Tester");
    }, PLAYER_KEY);
    await page.goto("/games/memory-cards");

    await expect(page.getByTestId("memory-moves")).toHaveText("0");
    await page.getByTestId("memory-card-0").click();
    await page.getByTestId("memory-card-1").click();
    await expect(page.getByTestId("memory-moves")).toHaveText("1");
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

    await page.getByRole("link", { name: "All games" }).click();
    await page.getByTestId("game-card-wordle").click();
    await expect(page).toHaveURL(/wordle/);
    await expect(page.getByTestId("wordle-page")).toBeVisible();

    await page.getByRole("link", { name: "All games" }).click();
    await page.getByTestId("game-card-ttt").click();
    await expect(page).toHaveURL(/tic-tac-toe/);
    await expect(page.getByTestId("ttt-page")).toBeVisible();

    await page.getByRole("link", { name: "All games" }).click();
    await page.getByTestId("game-card-memory").click();
    await expect(page).toHaveURL(/memory-cards/);
    await expect(page.getByTestId("memory-page")).toBeVisible();
  });
});
