import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";

/** Used only if `public/wordle-*.txt` fails to load (offline build preview, etc.). */
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

/** Vite `BASE_URL` is a path like `/` or `/repo/` — do not pass it alone to `new URL()` as a base (invalid in the browser). */
const WORDS_URL = `${import.meta.env.BASE_URL}wordle-words.txt`;
const ANSWERS_URL = `${import.meta.env.BASE_URL}wordle-answers.txt`;

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

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function parseWordLines(text) {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim().toLowerCase())
    .filter((w) => /^[a-z]{5}$/.test(w));
}

export function Wordle() {
  const { playerName } = usePlayer();
  const [allowedList, setAllowedList] = useState(null);
  const [answerList, setAnswerList] = useState(null);
  const [answer, setAnswer] = useState(() => randomFrom(FALLBACK_WORDS));
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [revealingRow, setRevealingRow] = useState(-1);
  const [shakeRow, setShakeRow] = useState(-1);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
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

    async function loadWordLists() {
      try {
        const [wRes, aRes] = await Promise.all([
          fetch(WORDS_URL, { signal: controller.signal }),
          fetch(ANSWERS_URL, { signal: controller.signal }),
        ]);
        if (!wRes.ok || !aRes.ok) return;

        const [wText, aText] = await Promise.all([wRes.text(), aRes.text()]);
        const allowed = parseWordLines(wText);
        const answers = parseWordLines(aText);

        if (allowed.length > 0) {
          setAllowedList(allowed);
        }
        if (answers.length > 0) {
          setAnswerList(answers);
        }
      } catch {
        /* keep bundled fallbacks */
      }
    }

    loadWordLists();
    return () => controller.abort();
  }, []);

  const validGuesses = useMemo(() => {
    const merged = new Set(FALLBACK_VALID_GUESSES);
    if (allowedList) {
      for (const word of allowedList) merged.add(word);
    }
    // Answer words must also be accepted as valid guesses — without this,
    // words that only appear in wordle-answers.txt (e.g. "adore") are
    // incorrectly rejected with "Word not in dictionary."
    if (answerList) {
      for (const word of answerList) merged.add(word);
    }
    return merged;
  }, [allowedList, answerList]);

  const answerPool = useMemo(
    () => (answerList && answerList.length > 0 ? answerList : FALLBACK_WORDS),
    [answerList],
  );

  useEffect(() => {
    if (!answerList || answerList.length === 0) return;
    setAnswer((prev) =>
      answerList.includes(prev) ? prev : randomFrom(answerList),
    );
  }, [answerList]);

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

  const submitGuess = async (e) => {
    e.preventDefault();
    if (gameOver || isRevealing || isChecking) return;

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
      // Fall back to a live dictionary API so real words not in the local
      // word lists (e.g. "alive") are still accepted.
      setIsChecking(true);
      try {
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${guess}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (!res.ok) {
          setIsChecking(false);
          showInvalidGuess("Word not in dictionary.");
          return;
        }
      } catch {
        // Network error — fall back to permissive (accept the word)
      } finally {
        setIsChecking(false);
      }
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
    setAnswer(randomFrom(answerPool));
    setGuesses([]);
    setCurrent("");
    setError("");
    setRevealingRow(-1);
    setShakeRow(-1);
    setIsRevealing(false);
    setIsChecking(false);
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
          Guess the five-letter word in {MAX_GUESSES} tries. Green is correct, amber is in the word
          but wrong position. Guesses may be any common English five-letter word in the dictionary.
        </p>

        <div className="wordle-grid" aria-label="Wordle board" data-testid="wordle-grid">
          {rows.map((row, r) => (
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
            disabled={gameOver || isRevealing || isChecking}
            placeholder="Type 5 letters"
            aria-label="Word guess"
            data-testid="wordle-input"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={gameOver || isRevealing || isChecking}
            data-testid="wordle-submit"
          >
            {isChecking ? "Checking…" : "Submit guess"}
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
