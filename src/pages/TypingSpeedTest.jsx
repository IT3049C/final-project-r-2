import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";

export const TYPING_SAMPLE =
  "The quick brown fox jumps over the lazy dog before the sun rises over Cincinnati.";

const DURATION_SEC = 30;

function countCorrectPrefix(target, typed) {
  let n = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === target[i]) n++;
    else break;
  }
  return n;
}

export function TypingSpeedTest() {
  const { playerName } = usePlayer();
  const [phase, setPhase] = useState("idle");
  const [typed, setTyped] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SEC);
  const intervalRef = useRef(null);
  const inputRef = useRef(null);

  const target = TYPING_SAMPLE;

  const correct = useMemo(() => countCorrectPrefix(target, typed), [target, typed]);

  const elapsedSec = useMemo(() => {
    if (phase === "idle") return 0;
    return DURATION_SEC - secondsLeft;
  }, [phase, secondsLeft]);

  const wpm = useMemo(() => {
    if (elapsedSec <= 0) return 0;
    const minutes = elapsedSec / 60;
    return Math.round((correct / 5) / minutes);
  }, [correct, elapsedSec]);

  const accuracyPct =
    typed.length === 0 ? 100 : Math.round((correct / typed.length) * 100);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const finish = useCallback(() => {
    stopTimer();
    setPhase("done");
  }, [stopTimer]);

  useEffect(() => {
    if (phase === "active" && typed === target) {
      finish();
    }
  }, [phase, typed, target, finish]);

  const start = () => {
    setTyped("");
    setSecondsLeft(DURATION_SEC);
    setPhase("active");
    stopTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopTimer();
          setPhase("done");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const reset = () => {
    stopTimer();
    setPhase("idle");
    setTyped("");
    setSecondsLeft(DURATION_SEC);
  };

  return (
    <article className="game-page" data-testid="typing-page">
      <header className="game-page-header">
        <h1 className="game-page-title">Typing Speed Test</h1>
        <p className="game-page-player" data-testid="typing-player-label">
          {playerName ? `${playerName}, type the passage below` : "Type the passage below"}
        </p>
      </header>

      <div className="typing-panel">
        <p className="typing-rules">
          You have <strong>{DURATION_SEC} seconds</strong> or until you finish the text with no
          errors at the end. Spaces count—match the sample exactly.
        </p>

        <div className="typing-stats">
          <div className="typing-stat">
            <span className="typing-stat-label">Timer</span>
            <span className="typing-stat-value" data-testid="typing-timer">
              {phase === "idle" ? "—" : `${secondsLeft}s`}
            </span>
          </div>
          <div className="typing-stat">
            <span className="typing-stat-label">WPM</span>
            <span className="typing-stat-value" data-testid="typing-wpm">
              {phase === "active" || phase === "done" ? wpm : "—"}
            </span>
          </div>
          <div className="typing-stat">
            <span className="typing-stat-label">Accuracy</span>
            <span className="typing-stat-value" data-testid="typing-accuracy">
              {phase === "idle" ? "—" : `${accuracyPct}%`}
            </span>
          </div>
        </div>

        <div className="typing-sample" aria-label="Text to type">
          {target.split("").map((ch, i) => {
            let cls = "typing-char typing-char--todo";
            if (i < typed.length) {
              cls =
                typed[i] === ch ? "typing-char typing-char--ok" : "typing-char typing-char--bad";
            }
            return (
              <span key={i} className={cls}>
                {ch === " " ? "\u00a0" : ch}
              </span>
            );
          })}
        </div>

        <textarea
          ref={inputRef}
          className="typing-input"
          rows={3}
          disabled={phase !== "active"}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={phase === "idle" ? 'Press "Start test" to begin…' : "Type here…"}
          data-testid="typing-input"
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Typing input"
        />

        <div className="typing-actions">
          {phase === "idle" ? (
            <button type="button" className="btn btn-primary" onClick={start} data-testid="typing-start">
              Start test
            </button>
          ) : null}
          {phase === "active" ? (
            <button type="button" className="btn btn-ghost" onClick={finish} data-testid="typing-finish-early">
              End early
            </button>
          ) : null}
          {phase === "done" ? (
            <>
              <p className="typing-summary" data-testid="typing-summary">
                {correct === target.length
                  ? "Perfect run—you matched every character."
                  : `You typed ${correct} correct characters in a row from the start.`}{" "}
                Net WPM: <strong>{wpm}</strong>.
              </p>
              <button type="button" className="btn btn-primary" onClick={reset} data-testid="typing-reset">
                Try again
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
