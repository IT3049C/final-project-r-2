import { useCallback, useState } from "react";
import { RockPaperScissorsMultiplayer } from "../components/RockPaperScissorsMultiplayer.jsx";
import { usePlayer } from "../context/PlayerContext.jsx";

const choices = [
  { id: "rock", label: "Rock", emoji: "✊", testId: "rps-rock" },
  { id: "paper", label: "Paper", emoji: "✋", testId: "rps-paper" },
  { id: "scissors", label: "Scissors", emoji: "✌️", testId: "rps-scissors" },
];

function pickWinner(a, b) {
  if (a === b) return "tie";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  ) {
    return "player";
  }
  return "computer";
}

export function RockPaperScissors() {
  const { playerName } = usePlayer();
  const [mode, setMode] = useState("solo");
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [scores, setScores] = useState({ player: 0, computer: 0, ties: 0 });

  const playRound = useCallback((choice) => {
    const comp = choices[Math.floor(Math.random() * 3)].id;
    const outcome = pickWinner(choice, comp);
    setPlayerChoice(choice);
    setComputerChoice(comp);
    setLastResult(outcome);
    setScores((s) => ({
      ...s,
      player: outcome === "player" ? s.player + 1 : s.player,
      computer: outcome === "computer" ? s.computer + 1 : s.computer,
      ties: outcome === "tie" ? s.ties + 1 : s.ties,
    }));
  }, []);

  const resetMatch = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setLastResult(null);
    setScores({ player: 0, computer: 0, ties: 0 });
  };

  const compLabel = choices.find((c) => c.id === computerChoice)?.label ?? "—";
  const playLabel = choices.find((c) => c.id === playerChoice)?.label ?? "—";

  let resultText = "Choose your move.";
  if (lastResult === "player") resultText = "You win this round!";
  if (lastResult === "computer") resultText = "Computer wins this round.";
  if (lastResult === "tie") resultText = "It’s a tie.";

  return (
    <article className="game-page" data-testid="rps-page">
      <header className="game-page-header">
        <h1 className="game-page-title">Rock Paper Scissors</h1>
        <p className="game-page-player" data-testid="rps-player-label">
          {mode === "solo"
            ? playerName
              ? `${playerName} vs Computer`
              : "You vs Computer"
            : playerName
              ? `${playerName} — online`
              : "Online — set your name in the header"}
        </p>
      </header>

      <div className="rps-mode" role="tablist" aria-label="Game mode">
        <button
          type="button"
          className={`rps-mode-btn${mode === "solo" ? " rps-mode-btn--active" : ""}`}
          role="tab"
          aria-selected={mode === "solo"}
          onClick={() => setMode("solo")}
          data-testid="rps-mode-solo"
        >
          vs Computer
        </button>
        <button
          type="button"
          className={`rps-mode-btn${mode === "online" ? " rps-mode-btn--active" : ""}`}
          role="tab"
          aria-selected={mode === "online"}
          onClick={() => setMode("online")}
          data-testid="rps-mode-online"
        >
          Online (2 players)
        </button>
      </div>

      {mode === "online" ? (
        <RockPaperScissorsMultiplayer />
      ) : null}

      <div className={`rps-board${mode === "online" ? " rps-board--hidden" : ""}`}>
        <div className="rps-score">
          <div>
            <span className="rps-score-label">You</span>
            <span className="rps-score-value" data-testid="rps-score-player">
              {scores.player}
            </span>
          </div>
          <div>
            <span className="rps-score-label">Ties</span>
            <span className="rps-score-value">{scores.ties}</span>
          </div>
          <div>
            <span className="rps-score-label">CPU</span>
            <span className="rps-score-value" data-testid="rps-score-computer">
              {scores.computer}
            </span>
          </div>
        </div>

        <p className="rps-last" data-testid="rps-result">
          {resultText}
        </p>

        <div className="rps-choices">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="rps-btn"
              data-testid={c.testId}
              onClick={() => playRound(c.id)}
            >
              <span className="rps-btn-emoji" aria-hidden="true">
                {c.emoji}
              </span>
              {c.label}
            </button>
          ))}
        </div>

        {playerChoice ? (
          <p className="rps-detail" data-testid="rps-detail">
            You played <strong>{playLabel}</strong>. Computer played{" "}
            <strong>{compLabel}</strong>.
          </p>
        ) : null}

        <button type="button" className="btn btn-ghost" onClick={resetMatch} data-testid="rps-reset">
          Reset scores
        </button>
      </div>
    </article>
  );
}
