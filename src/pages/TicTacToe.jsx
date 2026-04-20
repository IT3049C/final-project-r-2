import { useState, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";
import { useGameRoom } from "../hooks/useGameRoom.js";

// All eight lines that win a standard 3×3 Tic Tac Toe game.
const WIN_LINES = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // centre column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal ↘
  [2, 4, 6], // diagonal ↙
];

/** Return "X", "O", or null — pure function, no side effects. */
function getWinner(cells) {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  return null;
}

/**
 * The shape of the shared game state stored on the Game Room API server.
 * Every field here is visible to — and writable by — both players.
 *
 * players  – array of { name, mark } objects added as each player joins.
 * cells    – flat 9-element array representing the 3×3 board (null | "X" | "O").
 * turn     – whose mark moves next ("X" or "O").
 * winner   – mark of the winner once the game ends, or null.
 * isDraw   – true when all cells are filled with no winner.
 * score    – running totals that survive across rematches.
 * version  – integer incremented on every write; used to detect stale pushes.
 */
const INITIAL_STATE = {
  players: [],
  cells: Array(9).fill(null),
  turn: "X",
  winner: null,
  isDraw: false,
  score: { x: 0, o: 0, draws: 0 },
  version: 0,
};

export function TicTacToe() {
  const { playerName } = usePlayer();

  // useGameRoom handles all networking: creating a room, polling the server
  // every second, and pushing updated state after each move.
  const { roomId, gameState, isLoading, error, startRoom, joinRoom, pushState } =
    useGameRoom({ refetchInterval: 1000 });

  // myMark ("X" or "O") lives only in local state — it never goes to the server.
  // It tells this browser which player it is so we can block moves on the wrong turn.
  const [myMark, setMyMark] = useState(null);

  // Controlled input for the "Join Room" text field.
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  // ── Derive everything from the server snapshot ──────────────────────────────
  // Falling back to safe defaults until the first poll returns.
  const cells = gameState?.cells ?? Array(9).fill(null);
  const turn = gameState?.turn ?? "X";
  const winner = gameState?.winner ?? null;
  const isDraw = gameState?.isDraw ?? false;
  const score = gameState?.score ?? { x: 0, o: 0, draws: 0 };
  const players = gameState?.players ?? [];

  // The game can only be played once both seats are filled.
  const gameReady = players.length === 2;
  const gameOver = Boolean(winner) || isDraw;

  // ── Auto-registration effect ─────────────────────────────────────────────────
  // Runs every time the polled gameState changes.  Figures out which mark this
  // browser should play, and — for the joining player — writes their name into
  // the shared players array so the creator's screen updates too.
  useEffect(() => {
    // Nothing to do until we have a snapshot or if we already know our mark.
    if (!gameState || myMark) return;

    const existing = gameState.players ?? [];

    // Reconnect path: our name is already in the players list (e.g. after a
    // page refresh).  Just restore the local mark without writing to the server.
    const me = existing.find((p) => p.name === (playerName || "Player"));
    if (me) {
      setMyMark(me.mark);
      return;
    }

    // Join path: there is exactly one player (the creator) and it is not us.
    // Register ourselves as O and push the updated players list to the server
    // so both clients know the game is ready to start.
    if (existing.length === 1 && existing[0].name !== (playerName || "Player")) {
      const name = playerName || "Player 2";
      setMyMark("O");
      pushState({
        ...gameState,
        players: [...existing, { name, mark: "O" }],
      });
    }
  }, [gameState, myMark, playerName, pushState]);

  // ── Room creation ────────────────────────────────────────────────────────────
  // The first player seeds the server with an initial state that already
  // includes themselves as "X".  startRoom returns the generated roomId.
  const handleCreate = async () => {
    const name = playerName || "Player 1";
    setMyMark("X");
    await startRoom({
      ...INITIAL_STATE,
      players: [{ name, mark: "X" }],
    });
  };

  // ── Room joining ─────────────────────────────────────────────────────────────
  // joinRoom just sets the roomId; the polling useEffect in useGameRoom kicks
  // off immediately, and the auto-registration effect above handles the rest.
  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Please enter a room code.");
      return;
    }
    setJoinError("");
    joinRoom(code);
  };

  // ── Making a move ────────────────────────────────────────────────────────────
  // Only the player whose mark matches the current turn may write.
  // We compute the entire next state locally and push it as one atomic snapshot.
  const handlePlay = async (index) => {
    if (!gameReady || gameOver || cells[index] || turn !== myMark) return;

    const next = [...cells];
    next[index] = turn;

    // Determine outcome after this move.
    const nextWinner = getWinner(next);
    const nextDraw = !nextWinner && next.every((c) => c !== null);

    // Update the running score if the game just ended.
    const nextScore = { ...score };
    if (nextWinner === "X") nextScore.x += 1;
    else if (nextWinner === "O") nextScore.o += 1;
    else if (nextDraw) nextScore.draws += 1;

    // Push the new snapshot to the server.
    // The version field is incremented inside pushState (see useGameRoom.js).
    await pushState({
      ...gameState,
      cells: next,
      // Keep the current turn marker after the game ends so both sides know
      // who made the final move; otherwise switch to the next player.
      turn: nextWinner || nextDraw ? turn : turn === "X" ? "O" : "X",
      winner: nextWinner,
      isDraw: nextDraw,
      score: nextScore,
    });
  };

  // ── Reset helpers ────────────────────────────────────────────────────────────
  // Clear the board for a rematch while keeping the running score.
  const handleReset = async () => {
    if (!gameReady) return;
    await pushState({
      ...gameState,
      cells: Array(9).fill(null),
      turn: "X",
      winner: null,
      isDraw: false,
    });
  };

  // Clear the board AND the scoreboard.
  const handleResetScores = async () => {
    if (!gameReady) return;
    await pushState({
      ...gameState,
      cells: Array(9).fill(null),
      turn: "X",
      winner: null,
      isDraw: false,
      score: { x: 0, o: 0, draws: 0 },
    });
  };

  // ── Status message shown above the board ────────────────────────────────────
  let status = "";
  if (!roomId) {
    status = "Create or join a room to start.";
  } else if (!gameReady) {
    status = `Waiting for opponent… share code: ${roomId}`;
  } else if (winner) {
    const winnerPlayer = players.find((p) => p.mark === winner);
    status = myMark === winner ? "You win! 🎉" : `${winnerPlayer?.name ?? winner} wins!`;
  } else if (isDraw) {
    status = "Draw game!";
  } else if (turn === myMark) {
    status = "Your turn";
  } else {
    const opponent = players.find((p) => p.mark !== myMark);
    status = `${opponent?.name ?? "Opponent"}'s turn…`;
  }

  // ── LOBBY SCREEN ─────────────────────────────────────────────────────────────
  // Shown before a room has been created or joined.
  if (!roomId) {
    return (
      <article className="game-page ttt-page" data-testid="ttt-page">
        <header className="game-page-header">
          <h1 className="game-page-title">Tic Tac Toe</h1>
          <p className="game-page-player" data-testid="ttt-player-label">
            {playerName ? `Playing as ${playerName}` : "Set your name to play"}
          </p>
        </header>

        <div className="ttt-panel">
          <div className="ttt-lobby">
            {/* Option A: start a fresh game and receive a shareable room code */}
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isLoading}
            >
              {isLoading ? "Creating…" : "Create Room"}
            </button>

            <p className="ttt-lobby-or">— or —</p>

            {/* Option B: enter a code shared by the other player */}
            <div className="ttt-lobby-join">
              <input
                className="ttt-room-input"
                type="text"
                placeholder="Room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                aria-label="Room code"
                maxLength={10}
              />
              <button className="btn btn-primary" onClick={handleJoin}>
                Join Room
              </button>
            </div>

            {joinError && <p className="ttt-error">{joinError}</p>}
            {error && <p className="ttt-error">{error}</p>}
          </div>
        </div>
      </article>
    );
  }

  // ── GAME SCREEN ──────────────────────────────────────────────────────────────
  // Shown once a roomId exists (whether waiting for opponent or mid-game).
  return (
    <article className="game-page ttt-page" data-testid="ttt-page">
      <header className="game-page-header">
        <h1 className="game-page-title">Tic Tac Toe</h1>
        <p className="game-page-player" data-testid="ttt-player-label">
          {playerName
            ? `${playerName} — you are ${myMark ?? "…"}`
            : `You are ${myMark ?? "…"}`}
        </p>
        {/* Display the room code so the creator can share it with their opponent */}
        <p className="ttt-room-code">
          Room: <code>{roomId}</code>
        </p>
      </header>

      <div className="ttt-panel">
        {/* Running score — survives across rematches */}
        <div className="ttt-scoreboard" data-testid="ttt-scoreboard">
          <div className="ttt-score-item">
            <span className="ttt-score-label">X wins</span>
            <strong className="ttt-score-value" data-testid="ttt-score-x">
              {score.x}
            </strong>
          </div>
          <div className="ttt-score-item">
            <span className="ttt-score-label">Draws</span>
            <strong className="ttt-score-value" data-testid="ttt-score-draws">
              {score.draws}
            </strong>
          </div>
          <div className="ttt-score-item">
            <span className="ttt-score-label">O wins</span>
            <strong className="ttt-score-value" data-testid="ttt-score-o">
              {score.o}
            </strong>
          </div>
        </div>

        {/* Single line of contextual feedback for both players */}
        <p className="ttt-status" data-testid="ttt-status">
          {status}
        </p>

        {/* 3×3 board — cells are disabled when it is not this player's turn */}
        <div className="ttt-grid" role="grid" aria-label="Tic Tac Toe board">
          {cells.map((cell, index) => (
            <button
              key={index}
              type="button"
              className="ttt-cell"
              onClick={() => handlePlay(index)}
              // Disable the cell if: game not ready, game over, already occupied,
              // or it is the opponent's turn — prevents illegal moves client-side.
              disabled={
                !gameReady ||
                gameOver ||
                cells[index] !== null ||
                turn !== myMark
              }
              data-testid={`ttt-cell-${index}`}
              aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ""}`}
            >
              {cell ?? ""}
            </button>
          ))}
        </div>

        <div className="ttt-actions">
          {/* Rematch button — only appears once the round has ended */}
          {gameOver && gameReady && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleReset}
              data-testid="ttt-reset"
            >
              Restart match
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleResetScores}
            data-testid="ttt-reset-scores"
          >
            Reset scores
          </button>
        </div>

        {error && <p className="ttt-error">{error}</p>}
      </div>
    </article>
  );
}