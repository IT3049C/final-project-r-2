import { useState, useEffect, useCallback } from "react";
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

// ── Minimax AI ────────────────────────────────────────────────────────────────
// The computer always plays "O". Minimax exhaustively searches the 3×3 tree,
// making the computer unbeatable. The best it can achieve against it is a draw.

/**
 * Score a board position from the computer's perspective.
 * +10  computer ("O") wins
 * -10  human ("X") wins
 *  0   draw
 */
function minimax(cells, isMaximising) {
  const w = getWinner(cells);
  if (w === "O") return 10;
  if (w === "X") return -10;
  if (cells.every((c) => c !== null)) return 0;

  if (isMaximising) {
    // Computer's turn — pick the move with the highest score.
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!cells[i]) {
        cells[i] = "O";
        best = Math.max(best, minimax(cells, false));
        cells[i] = null;
      }
    }
    return best;
  } else {
    // Human's turn — assume they play optimally (lowest score for computer).
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!cells[i]) {
        cells[i] = "X";
        best = Math.min(best, minimax(cells, true));
        cells[i] = null;
      }
    }
    return best;
  }
}

/** Return the index of the computer's best move given the current board. */
function getBestMove(cells) {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!cells[i]) {
      cells[i] = "O";
      const score = minimax(cells, false);
      cells[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
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

  // ── Mode selection ────────────────────────────────────────────────────────
  // null       → lobby (choose mode)
  // "computer" → single-player vs minimax AI (pure local state, no network)
  // "multi"    → online multiplayer via Game Room API
  const [mode, setMode] = useState(null);

  // ── Computer-mode state ───────────────────────────────────────────────────
  // All state lives locally; nothing is sent to the server.
  const [cpuCells, setCpuCells] = useState(Array(9).fill(null));
  const [cpuTurn, setCpuTurn] = useState("X"); // human is always X
  const [cpuScore, setCpuScore] = useState({ x: 0, o: 0, draws: 0 });
  const [cpuThinking, setCpuThinking] = useState(false); // brief lock while AI "thinks"

  const cpuWinner = getWinner(cpuCells);
  const cpuDraw = !cpuWinner && cpuCells.every((c) => c !== null);
  const cpuOver = Boolean(cpuWinner) || cpuDraw;

  // ── Computer makes its move automatically after the human plays ───────────
  // A short setTimeout gives a natural 350 ms "thinking" pause.
  useEffect(() => {
    if (mode !== "computer") return;
    if (cpuOver || cpuTurn !== "O") return;

    setCpuThinking(true);
    const id = setTimeout(() => {
      const move = getBestMove([...cpuCells]);
      if (move === -1) return;

      const next = [...cpuCells];
      next[move] = "O";

      const nextWinner = getWinner(next);
      const nextDraw = !nextWinner && next.every((c) => c !== null);

      setCpuCells(next);
      if (nextWinner === "O") setCpuScore((s) => ({ ...s, o: s.o + 1 }));
      else if (nextDraw) setCpuScore((s) => ({ ...s, draws: s.draws + 1 }));
      else setCpuTurn("X");

      setCpuThinking(false);
    }, 350);

    return () => clearTimeout(id);
  }, [mode, cpuCells, cpuTurn, cpuOver]);

  // ── Human move in computer mode ───────────────────────────────────────────
  const handleCpuPlay = useCallback(
    (index) => {
      if (cpuOver || cpuCells[index] || cpuTurn !== "X" || cpuThinking) return;

      const next = [...cpuCells];
      next[index] = "X";

      const nextWinner = getWinner(next);
      const nextDraw = !nextWinner && next.every((c) => c !== null);

      setCpuCells(next);
      if (nextWinner === "X") setCpuScore((s) => ({ ...s, x: s.x + 1 }));
      else if (nextDraw) setCpuScore((s) => ({ ...s, draws: s.draws + 1 }));
      else setCpuTurn("O"); // triggers the AI useEffect above
    },
    [cpuCells, cpuTurn, cpuOver, cpuThinking]
  );

  const handleCpuReset = () => {
    setCpuCells(Array(9).fill(null));
    setCpuTurn("X");
  };

  const handleCpuResetScores = () => {
    setCpuCells(Array(9).fill(null));
    setCpuTurn("X");
    setCpuScore({ x: 0, o: 0, draws: 0 });
  };

  // ── Multiplayer state (Game Room API) ─────────────────────────────────────
  const { roomId, gameState, isLoading, error, startRoom, joinRoom, pushState } =
    useGameRoom({ refetchInterval: 1000 });

  const [myMark, setMyMark] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const cells = gameState?.cells ?? Array(9).fill(null);
  const turn = gameState?.turn ?? "X";
  const winner = gameState?.winner ?? null;
  const isDraw = gameState?.isDraw ?? false;
  const score = gameState?.score ?? { x: 0, o: 0, draws: 0 };
  const players = gameState?.players ?? [];

  const gameReady = players.length === 2;
  const gameOver = Boolean(winner) || isDraw;

  // Auto-registration: figures out this browser's mark and registers as O when joining.
  useEffect(() => {
    if (mode !== "multi" || !gameState || myMark) return;
    const existing = gameState.players ?? [];

    const me = existing.find((p) => p.name === (playerName || "Player"));
    if (me) { setMyMark(me.mark); return; }

    if (existing.length === 1 && existing[0].name !== (playerName || "Player")) {
      const name = playerName || "Player 2";
      setMyMark("O");
      pushState({ ...gameState, players: [...existing, { name, mark: "O" }] });
    }
  }, [mode, gameState, myMark, playerName, pushState]);

  const handleCreate = async () => {
    const name = playerName || "Player 1";
    setMyMark("X");
    await startRoom({
      ...INITIAL_STATE,
      players: [{ name, mark: "X" }],
    });
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError("Please enter a room code."); return; }
    setJoinError("");
    joinRoom(code);
  };

  const handlePlay = async (index) => {
    if (!gameReady || gameOver || cells[index] || turn !== myMark) return;
    const next = [...cells];
    next[index] = turn;
    const nextWinner = getWinner(next);
    const nextDraw = !nextWinner && next.every((c) => c !== null);
    const nextScore = { ...score };
    if (nextWinner === "X") nextScore.x += 1;
    else if (nextWinner === "O") nextScore.o += 1;
    else if (nextDraw) nextScore.draws += 1;
    await pushState({
      ...gameState,
      cells: next,
      turn: nextWinner || nextDraw ? turn : turn === "X" ? "O" : "X",
      winner: nextWinner,
      isDraw: nextDraw,
      score: nextScore,
    });
  };

  const handleReset = async () => {
    if (!gameReady) return;
    await pushState({ ...gameState, cells: Array(9).fill(null), turn: "X", winner: null, isDraw: false });
  };

  const handleResetScores = async () => {
    if (!gameReady) return;
    await pushState({ ...gameState, cells: Array(9).fill(null), turn: "X", winner: null, isDraw: false, score: { x: 0, o: 0, draws: 0 } });
  };

  let multiStatus = "";
  if (!roomId) {
    multiStatus = "Create or join a room to start.";
  } else if (!gameReady) {
    multiStatus = `Waiting for opponent… share code: ${roomId}`;
  } else if (winner) {
    const wp = players.find((p) => p.mark === winner);
    multiStatus = myMark === winner ? "You win! 🎉" : `${wp?.name ?? winner} wins!`;
  } else if (isDraw) {
    multiStatus = "Draw game!";
  } else if (turn === myMark) {
    multiStatus = "Your turn";
  } else {
    const opp = players.find((p) => p.mark !== myMark);
    multiStatus = `${opp?.name ?? "Opponent"}'s turn…`;
  }

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (!mode) {
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
            {/* Single-player vs minimax AI — no network required */}
            <button
              className="btn btn-primary ttt-lobby-wide"
              onClick={() => setMode("computer")}
            >
              🤖 Play vs Computer
            </button>

            <p className="ttt-lobby-or">— or play online —</p>

            {/* Multiplayer: start a new room */}
            <button
              className="btn btn-primary ttt-lobby-wide"
              onClick={() => { setMode("multi"); handleCreate(); }}
              disabled={isLoading}
            >
              {isLoading ? "Creating…" : "Create Room"}
            </button>

            {/* Multiplayer: join an existing room */}
            <div className="ttt-lobby-join">
              <input
                className="ttt-room-input"
                type="text"
                placeholder="Room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && (setMode("multi"), handleJoin())}
                aria-label="Room code"
                maxLength={10}
              />
              <button
                className="btn btn-primary"
                onClick={() => { setMode("multi"); handleJoin(); }}
              >
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

  // ── COMPUTER MODE GAME SCREEN ──────────────────────────────────────────────
  if (mode === "computer") {
    let cpuStatus = "";
    if (cpuWinner === "X") cpuStatus = "You win! 🎉";
    else if (cpuWinner === "O") cpuStatus = "Computer wins!";
    else if (cpuDraw) cpuStatus = "Draw game!";
    else if (cpuThinking) cpuStatus = "Computer is thinking…";
    else cpuStatus = "Your turn";

    return (
      <article className="game-page ttt-page" data-testid="ttt-page">
        <header className="game-page-header">
          <h1 className="game-page-title">Tic Tac Toe</h1>
          <p className="game-page-player" data-testid="ttt-player-label">
            {playerName ? `${playerName} (X) vs Computer (O)` : "You (X) vs Computer (O)"}
          </p>
        </header>

        <div className="ttt-panel">
          <div className="ttt-scoreboard" data-testid="ttt-scoreboard">
            <div className="ttt-score-item">
              <span className="ttt-score-label">You (X)</span>
              <strong className="ttt-score-value" data-testid="ttt-score-x">{cpuScore.x}</strong>
            </div>
            <div className="ttt-score-item">
              <span className="ttt-score-label">Draws</span>
              <strong className="ttt-score-value" data-testid="ttt-score-draws">{cpuScore.draws}</strong>
            </div>
            <div className="ttt-score-item">
              <span className="ttt-score-label">Computer</span>
              <strong className="ttt-score-value" data-testid="ttt-score-o">{cpuScore.o}</strong>
            </div>
          </div>

          <p className="ttt-status" data-testid="ttt-status">{cpuStatus}</p>

          <div className="ttt-grid" role="grid" aria-label="Tic Tac Toe board">
            {cpuCells.map((cell, index) => (
              <button
                key={index}
                type="button"
                className="ttt-cell"
                onClick={() => handleCpuPlay(index)}
                disabled={cpuOver || cpuCells[index] !== null || cpuTurn !== "X" || cpuThinking}
                data-testid={`ttt-cell-${index}`}
                aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ""}`}
              >
                {cell ?? ""}
              </button>
            ))}
          </div>

          <div className="ttt-actions">
            {cpuOver && (
              <button type="button" className="btn btn-ghost" onClick={handleCpuReset} data-testid="ttt-reset">
                Restart match
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={handleCpuResetScores} data-testid="ttt-reset-scores">
              Reset scores
            </button>
            {/* Let the player switch back to the lobby to change mode */}
            <button type="button" className="btn btn-ghost" onClick={() => { setMode(null); handleCpuResetScores(); }}>
              Change mode
            </button>
          </div>
        </div>
      </article>
    );
  }

  // ── MULTIPLAYER GAME SCREEN ────────────────────────────────────────────────
  return (
    <article className="game-page ttt-page" data-testid="ttt-page">
      <header className="game-page-header">
        <h1 className="game-page-title">Tic Tac Toe</h1>
        <p className="game-page-player" data-testid="ttt-player-label">
          {playerName
            ? `${playerName} — you are ${myMark ?? "…"}`
            : `You are ${myMark ?? "…"}`}
        </p>
        <p className="ttt-room-code">
          Room: <code>{roomId}</code>
        </p>
      </header>

      <div className="ttt-panel">
        <div className="ttt-scoreboard" data-testid="ttt-scoreboard">
          <div className="ttt-score-item">
            <span className="ttt-score-label">X wins</span>
            <strong className="ttt-score-value" data-testid="ttt-score-x">{score.x}</strong>
          </div>
          <div className="ttt-score-item">
            <span className="ttt-score-label">Draws</span>
            <strong className="ttt-score-value" data-testid="ttt-score-draws">{score.draws}</strong>
          </div>
          <div className="ttt-score-item">
            <span className="ttt-score-label">O wins</span>
            <strong className="ttt-score-value" data-testid="ttt-score-o">{score.o}</strong>
          </div>
        </div>

        <p className="ttt-status" data-testid="ttt-status">{multiStatus}</p>

        <div className="ttt-grid" role="grid" aria-label="Tic Tac Toe board">
          {cells.map((cell, index) => (
            <button
              key={index}
              type="button"
              className="ttt-cell"
              onClick={() => handlePlay(index)}
              disabled={!gameReady || gameOver || cells[index] !== null || turn !== myMark}
              data-testid={`ttt-cell-${index}`}
              aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ""}`}
            >
              {cell ?? ""}
            </button>
          ))}
        </div>

        <div className="ttt-actions">
          {gameOver && gameReady && (
            <button type="button" className="btn btn-ghost" onClick={handleReset} data-testid="ttt-reset">
              Restart match
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleResetScores} data-testid="ttt-reset-scores">
            Reset scores
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setMode(null)}>
            Change mode
          </button>
        </div>

        {error && <p className="ttt-error">{error}</p>}
      </div>
    </article>
  );
}