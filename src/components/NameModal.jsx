import { useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";

export function NameModal() {
  const { playerName, setPlayerName, ready } = usePlayer();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  if (!ready || playerName) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter a name to continue.");
      return;
    }
    setError("");
    setPlayerName(trimmed);
  };

  return (
    <div
      className="name-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-modal-title"
      data-testid="name-modal"
    >
      <div className="name-modal-card">
        <h2 id="name-modal-title" className="name-modal-title">
          Welcome to Game Hub
        </h2>
        <p className="name-modal-hint">
          Enter your player name once. It will show on every game screen. You can see the game cards
          dimmed behind this window—after you continue, you’ll choose one to play.
        </p>
        <form onSubmit={handleSubmit} className="name-modal-form">
          <label htmlFor="player-name-input" className="sr-only">
            Player name
          </label>
          <input
            id="player-name-input"
            type="text"
            autoComplete="nickname"
            maxLength={40}
            placeholder="Your name"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            data-testid="player-name-input"
            className="name-modal-input"
          />
          {error ? (
            <p className="name-modal-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" data-testid="player-name-submit" className="btn btn-primary">
            Let&apos;s play
          </button>
        </form>
      </div>
    </div>
  );
}
