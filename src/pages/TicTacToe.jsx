import { useMemo, useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinner(cells) {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  return null;
}

export function TicTacToe() {
  const { playerName } = usePlayer();
  const [cells, setCells] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [score, setScore] = useState({ x: 0, o: 0, draws: 0 });

  const winner = useMemo(() => getWinner(cells), [cells]);
  const isDraw = !winner && cells.every((c) => c !== null);
  const gameOver = Boolean(winner) || isDraw;

  const play = (index) => {
    if (cells[index] || gameOver) return;

    const next = [...cells];
    next[index] = turn;
    const nextWinner = getWinner(next);
    const nextDraw = !nextWinner && next.every((c) => c !== null);

    setCells(next);

    if (nextWinner === "X") {
      setScore((prev) => ({ ...prev, x: prev.x + 1 }));
    } else if (nextWinner === "O") {
      setScore((prev) => ({ ...prev, o: prev.o + 1 }));
    } else if (nextDraw) {
      setScore((prev) => ({ ...prev, draws: prev.draws + 1 }));
    } else {
      setTurn((t) => (t === "X" ? "O" : "X"));
    }
  };

  const reset = () => {
    setCells(Array(9).fill(null));
    setTurn("X");
  };

  const resetScoreboard = () => {
    setScore({ x: 0, o: 0, draws: 0 });
    reset();
  };

  let status = `Turn: ${turn}`;
  if (winner) {
    status = `Winner: ${winner}`;
  } else if (isDraw) {
    status = "Draw game.";
  }

  return (
    <article className="game-page ttt-page" data-testid="ttt-page">
      <header className="game-page-header">
        <h1 className="game-page-title">Tic Tac Toe</h1>
        <p className="game-page-player" data-testid="ttt-player-label">
          {playerName ? `${playerName}, you are X` : "You are X"}
        </p>
      </header>

      <div className="ttt-panel">
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

        <p className="ttt-status" data-testid="ttt-status">
          {status}
        </p>

        <div className="ttt-grid" role="grid" aria-label="Tic Tac Toe board">
          {cells.map((cell, index) => (
            <button
              key={index}
              type="button"
              className="ttt-cell"
              onClick={() => play(index)}
              data-testid={`ttt-cell-${index}`}
              aria-label={`Cell ${index + 1}`}
            >
              {cell ?? ""}
            </button>
          ))}
        </div>

        <div className="ttt-actions">
          <button type="button" className="btn btn-ghost" onClick={reset} data-testid="ttt-reset">
            Restart match
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={resetScoreboard}
            data-testid="ttt-reset-scores"
          >
            Reset scores
          </button>
        </div>
      </div>
    </article>
  );
}