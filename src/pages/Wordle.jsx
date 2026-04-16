import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";

const FALLBACK_WORDS = ["react", "vivid", "coder", "input", "route", "state", "hooks", "pixel"];
const FALLBACK_VALID_GUESSES = new Set([
  ...FALLBACK_WORDS,
  "audio",
  "adieu",
  "table",
  "crane",
  "stone",
  "light",
  "world",
  "smile",
  "grape",
  "train",
  "brand",
  "sugar",
]);
const WORD_CATALOGUE_API = "https://api.datamuse.com/words?sp=?????&max=1000";
const MAX_GUESSES = 6;
const WORD_LEN = 5;
const REVEAL_STEP_MS = 220;
const REVEAL_TOTAL_MS = REVEAL_STEP_MS * WORD_LEN + 120;
const SHAKE_MS = 420;

function evaluateGuess(guess, answer) {
  const result = Array(WORD_LEN).fill("absent");
  const counts = {};

  for (let i = 0; i < WORD_LEN; i++) {
    const ch = answer[i];
    counts[ch] = (counts[ch] ?? 0) + 1;
  }

  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      counts[guess[i]] -= 1;
    }
  }

  for (let i = 0; i < WORD_LEN; i++) {
    if (result[i] !== "correct" && (counts[guess[i]] ?? 0) > 0) {
      result[i] = "present";
      counts[guess[i]] -= 1;
    }
  }

  return result;
}

function randomWord() {
  return FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
}

export function Wordle() {
  const { playerName } = usePlayer();
  const [answer, setAnswer] = useState(() => randomWord());
  const [catalogueWords, setCatalogueWords] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [revealingRow, setRevealingRow] = useState(-1);
  const [shakeRow, setShakeRow] = useState(-1);
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimerRef = useRef(null);
  const shakeTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalogue() {
      try {
        const res = await fetch(WORD_CATALOGUE_API, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const words = Array.from(
          new Set(
            data
              .map((item) => String(item?.word ?? "").toLowerCase())
              .filter((word) => /^[a-z]{5}$/.test(word))
          )
        );

        if (words.length > 0) {
          setCatalogueWords(words);
        }
      } catch {
        // Silent fallback to bundled words if the API is unavailable.
      }
    }

    loadCatalogue();
    return () => controller.abort();
  }, []);

  const validGuesses = useMemo(() => {
    const merged = new Set(FALLBACK_VALID_GUESSES);
    for (const word of catalogueWords) merged.add(word);
    return merged;
  }, [catalogueWords]);

  const answerPool = useMemo(
    () => (catalogueWords.length > 0 ? catalogueWords : FALLBACK_WORDS),
    [catalogueWords]
  );

  useEffect(() => {
    if (catalogueWords.length === 0) return;
    if (!catalogueWords.includes(answer)) {
      setAnswer(catalogueWords[Math.floor(Math.random() * catalogueWords.length)]);
    }
  }, [answer, catalogueWords]);

  const won = guesses.some((g) => g.word === answer);
  const lost = guesses.length >= MAX_GUESSES && !won;
  const gameOver = won || lost;

  const rows = useMemo(() => {
    const built = guesses.map((g) => ({ letters: g.word.split(""), states: g.states }));

    if (!gameOver) {
      const preview = current.padEnd(WORD_LEN, " ").slice(0, WORD_LEN).split("");
      built.push({ letters: preview, states: Array(WORD_LEN).fill("pending") });
    }

    while (built.length < MAX_GUESSES) {
      built.push({ letters: Array(WORD_LEN).fill(" "), states: Array(WORD_LEN).fill("empty") });
    }

    return built;
  }, [current, gameOver, guesses]);

  const showInvalidGuess = (message) => {
    setError(message);
    setShakeRow(guesses.length);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShakeRow(-1), SHAKE_MS);
  };

  const submitGuess = (e) => {
    e.preventDefault();
    if (gameOver || isRevealing) return;

    const guess = current.toLowerCase().trim();
    if (guess.length !== WORD_LEN) {
      showInvalidGuess("Enter a 5-letter word.");
      return;
    }

    if (!/^[a-z]+$/.test(guess)) {
      showInvalidGuess("Only letters are allowed.");
      return;
    }

    if (!validGuesses.has(guess)) {
      showInvalidGuess("Word not in dictionary.");
      return;
    }

    const rowIndex = guesses.length;
    setGuesses((prev) => [...prev, { word: guess, states: evaluateGuess(guess, answer) }]);
    setCurrent("");
    setError("");
    setRevealingRow(rowIndex);
    setIsRevealing(true);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      setRevealingRow(-1);
      setIsRevealing(false);
    }, REVEAL_TOTAL_MS);
  };

  const reset = () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    setAnswer(answerPool[Math.floor(Math.random() * answerPool.length)]);
    setGuesses([]);
    setCurrent("");
    setError("");
    setRevealingRow(-1);
    setShakeRow(-1);
    setIsRevealing(false);
  };

  return (
    <article className="game-page wordle-page" data-testid="wordle-page">
      <header className="game-page-header">
        <h1 className="game-page-title">Wordle</h1>
        <p className="game-page-player" data-testid="wordle-player-label">
          {playerName ? `${playerName}, crack the hidden word` : "Crack the hidden word"}
        </p>
      </header>

      <div className="wordle-panel">
        <p className="wordle-rules">
          Guess the five-letter word in {MAX_GUESSES} tries. Green is correct, amber is in the
          word but wrong position.
        </p>

        <div className="wordle-grid" aria-label="Wordle board" data-testid="wordle-grid">
          {rows.map((row, r) => (
            // Keep guessed rows colored after reveal; active reveal row gets its color mid-flip.
            <div
              className={`wordle-row${revealingRow === r ? " wordle-row--reveal" : ""}${
                shakeRow === r ? " wordle-row--shake" : ""
              }`}
              key={r}
            >
              {row.letters.map((ch, c) => (
                <span
                  className={`wordle-cell wordle-cell--${row.states[c]}${
                    r < guesses.length && revealingRow !== r ? " wordle-cell--locked" : ""
                  }${
                    r === guesses.length && ch !== " " && !gameOver ? " wordle-cell--typed" : ""
                  }`}
                  key={`${r}-${c}`}
                  style={{ "--flip-index": c }}
                >
                  {ch === " " ? "" : ch.toUpperCase()}
                </span>
              ))}
            </div>
          ))}
        </div>

        <form className="wordle-controls" onSubmit={submitGuess}>
          <input
            className="wordle-input"
            type="text"
            value={current}
            onChange={(e) => setCurrent(e.target.value.slice(0, WORD_LEN))}
            disabled={gameOver || isRevealing}
            placeholder="Type 5 letters"
            aria-label="Word guess"
            data-testid="wordle-input"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={gameOver || isRevealing}
            data-testid="wordle-submit"
          >
            Submit guess
          </button>
          <button type="button" className="btn btn-ghost" onClick={reset} data-testid="wordle-reset">
            New word
          </button>
        </form>

        {error ? (
          <p className="wordle-feedback wordle-feedback--error" data-testid="wordle-feedback">
            {error}
          </p>
        ) : null}
        {won ? (
          <p className="wordle-feedback wordle-feedback--win" data-testid="wordle-feedback">
            You solved it in {guesses.length} {guesses.length === 1 ? "guess" : "guesses"}.
          </p>
        ) : null}
        {lost ? (
          <p className="wordle-feedback wordle-feedback--loss" data-testid="wordle-feedback">
            Out of tries. The word was <strong>{answer.toUpperCase()}</strong>.
          </p>
        ) : null}
      </div>
    </article>
  );
}