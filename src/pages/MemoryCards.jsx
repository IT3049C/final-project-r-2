import { useMemo, useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";

// These are the 6 symbols used in the game.
// Each symbol appears on exactly 2 cards, making 12 cards total (6 pairs).
// To add more pairs, just add more icons to this list.
const ICONS = ["🍎", "🚀", "🎧", "🌟", "⚽", "🎲"];

// makeDeck — creates a brand new set of 12 shuffled cards.
// It takes each icon and makes two copies of it (a pair).
// Then it randomly scrambles the order so the cards are in a different
// position every time you start a new game.
function makeDeck() {
  // Create two card objects for every icon (one pair per icon).
  // Each card has a unique id, the icon it shows, and matched: false
  // because no pairs have been found yet.
  const cards = ICONS.flatMap((icon) => [
    { id: `${icon}-a`, icon, matched: false },
    { id: `${icon}-b`, icon, matched: false },
  ]);

  // Shuffle the cards into a random order using the Fisher-Yates algorithm.
  // It walks backwards through the array and swaps each card with a randomly
  // chosen card before it, giving a perfectly unbiased shuffle.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

export function MemoryCards() {
  const { playerName } = usePlayer();

  // deck — the list of all 12 cards on the board.
  // When a pair is matched, both cards in the pair get marked as matched: true.
  const [deck, setDeck] = useState(() => makeDeck());

  // flippedIds — keeps track of which card(s) the player has just clicked.
  // This holds at most 2 card ids at a time (the two cards currently face-up).
  // Once the pair is resolved (matched or flipped back), this resets to empty.
  const [flippedIds, setFlippedIds] = useState([]);

  // moves — counts how many times the player has flipped a second card.
  // Each "move" is one pair attempt (whether it matches or not).
  const [moves, setMoves] = useState(0);

  // isResolving — acts as a short lock that prevents clicking while the
  // match or no-match animation is playing.
  // Without this, a fast player could flip a third card before the first
  // two have been evaluated.
  const [isResolving, setIsResolving] = useState(false);

  // matchedCount — the number of pairs found so far.
  // Calculated directly from the deck so it's always accurate.
  const matchedCount = useMemo(() => deck.filter((c) => c.matched).length / 2, [deck]);

  // allMatched — becomes true once every pair has been found.
  // Used to show the win message at the bottom of the board.
  const allMatched = matchedCount === ICONS.length;

  // flipCard — called whenever the player clicks a card.
  //
  // What it does step by step:
  //   1. Ignores the click if the board is locked, the card is already matched,
  //      the player clicked the same card twice, or two cards are already showing.
  //   2. On the FIRST click  → shows the card and waits for a second click.
  //   3. On the SECOND click → locks the board, counts the move, then checks
  //      whether the two face-up cards share the same icon:
  //        • Same icon  → after a short pause (280 ms) both cards stay face-up
  //                       and are permanently marked as matched.
  //        • Different  → after a longer pause (650 ms) both cards flip back
  //                       face-down so the player can try again.
  //      The longer pause on a no-match gives the player time to memorise
  //      where those cards are before they disappear.
  const flipCard = (card) => {
    // Ignore click if animating, card is already matched, same card, or two
    // cards are already showing.
    if (isResolving || card.matched || flippedIds.includes(card.id) || flippedIds.length >= 2) return;

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    // Only evaluate a match once the second card has been flipped.
    if (nextFlipped.length === 2) {
      setIsResolving(true); // lock the board while resolving
      setMoves((m) => m + 1); // count this as one move attempt

      const [firstId, secondId] = nextFlipped;
      const first = deck.find((c) => c.id === firstId);
      const second = deck.find((c) => c.id === secondId);

      if (first && second && first.icon === second.icon) {
        // ── Match! ───────────────────────────────────────────────────────────
        // Wait 280 ms so the player can see both icons, then permanently
        // reveal the pair by marking both cards as matched.
        setTimeout(() => {
          setDeck((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, matched: true } // keep this pair face-up forever
                : c
            )
          );
          setFlippedIds([]);
          setIsResolving(false);
        }, 280);
      } else {
        // ── No match ─────────────────────────────────────────────────────────
        // Wait 650 ms so the player can memorise the positions, then flip
        // both cards back face-down.
        setTimeout(() => {
          setFlippedIds([]);
          setIsResolving(false);
        }, 650);
      }
    }
  };

  // restart — resets the game back to the very beginning.
  // It reshuffles the cards into a new random order and clears all the
  // scores and state so the player starts fresh.
  const restart = () => {
    setDeck(makeDeck());   // new shuffle
    setFlippedIds([]);     // no cards face-up
    setMoves(0);           // reset move counter
    setIsResolving(false); // release any leftover lock
  };

  return (
    <article className="game-page memory-page" data-testid="memory-page">
      <header className="game-page-header">
        <h1 className="game-page-title">Memory Cards</h1>
        <p className="game-page-player" data-testid="memory-player-label">
          {playerName ? `${playerName}, match all pairs` : "Match all pairs"}
        </p>
      </header>

      <div className="memory-panel">
        {/* Stats bar — shows the move count and how many pairs have been found */}
        <div className="memory-stats">
          <div className="memory-stat">
            <span className="memory-stat-label">Moves</span>
            <strong className="memory-stat-value" data-testid="memory-moves">
              {moves}
            </strong>
          </div>
          <div className="memory-stat">
            <span className="memory-stat-label">Pairs found</span>
            <strong className="memory-stat-value" data-testid="memory-pairs">
              {matchedCount}/{ICONS.length}
            </strong>
          </div>
        </div>

        <div className="memory-grid" role="grid" aria-label="Memory cards board">
          {deck.map((card, index) => {
            // A card shows its icon if it has been matched OR if the player
            // just clicked it (it's in the temporary flippedIds list).
            const isFlipped = card.matched || flippedIds.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                // memory-card--flipped triggers the CSS 3-D flip animation to
                // reveal the icon. memory-card--matched adds a green glow to
                // show the pair has been permanently found.
                className={`memory-card${isFlipped ? " memory-card--flipped" : ""}${
                  card.matched ? " memory-card--matched" : ""
                }`}
                onClick={() => flipCard(card)}
                data-testid={`memory-card-${index}`}
                aria-label={`Memory card ${index + 1}`}
                // Hidden cards are disabled while the board is resolving so
                // the player can't accidentally flip a third card.
                disabled={isResolving && !isFlipped}
              >
                {/* Front face — the "?" shown while the card is face-down */}
                <span className="memory-card-face memory-card-face--front" aria-hidden="true">
                  ?
                </span>
                {/* Back face — the icon revealed when the card is flipped */}
                <span className="memory-card-face memory-card-face--back" aria-hidden="true">
                  {card.icon}
                </span>
              </button>
            );
          })}
        </div>

        {/* Win message — only appears once every single pair has been matched */}
        {allMatched ? (
          <p className="memory-win" data-testid="memory-win">
            Great memory. You cleared the board in {moves} {moves === 1 ? "move" : "moves"}.
          </p>
        ) : null}

        <button type="button" className="btn btn-ghost" onClick={restart} data-testid="memory-reset">
          Shuffle and restart
        </button>
      </div>
    </article>
  );
}

/**
 * makeDeck — builds and shuffles a fresh 12-card deck.
 *
 * flatMap turns each icon into two card objects (the "a" and "b" copies of a
 * pair). Every card starts with matched: false so the board begins fully hidden.
 *
 * The Fisher-Yates shuffle (the for loop) iterates backwards through the array
 * and swaps each element with a randomly chosen earlier element. This guarantees
 * a perfectly uniform shuffle with no bias.
 */
function makeDeck() {
  const cards = ICONS.flatMap((icon) => [
    { id: `${icon}-a`, icon, matched: false },
    { id: `${icon}-b`, icon, matched: false },
  ]);

  // Fisher-Yates shuffle: walk backwards and swap each card with a random card
  // at or before its current position.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

export function MemoryCards() {
  const { playerName } = usePlayer();

  // deck: the full 12-card array. Cards are updated in place (matched: true)
  // once a pair is found.
  const [deck, setDeck] = useState(() => makeDeck());

  // flippedIds: holds the id(s) of the card(s) currently face-up but not yet
  // resolved. At most two ids can be here at once.
  const [flippedIds, setFlippedIds] = useState([]);

  // moves: incremented every time the player flips a second card (one "move"
  // = one pair attempt, whether it matches or not).
  const [moves, setMoves] = useState(0);

  // isResolving: true for the brief window after two cards are flipped while
  // the match/no-match animation plays. Blocks all clicks during that window.
  const [isResolving, setIsResolving] = useState(false);

  // matchedCount: number of pairs found so far (derived from deck so it always
  // stays in sync without a separate state variable).
  const matchedCount = useMemo(() => deck.filter((c) => c.matched).length / 2, [deck]);

  // allMatched: true when every pair has been found — triggers the win message.
  const allMatched = matchedCount === ICONS.length;

  /**
   * flipCard — handles a click on any card.
   *
   * Guard clause: ignore the click if…
   *   • the game is mid-animation (isResolving)
   *   • the card is already permanently matched
   *   • the same card is clicked twice
   *   • two cards are already face-up waiting to be resolved
   *
   * First flip: just add the card id to flippedIds and wait for a second click.
   *
   * Second flip: add the id, increment moves, then compare the two icons:
   *   • Match  → after 280 ms mark both cards matched: true and clear flippedIds.
   *              The short delay lets the player see both icons briefly.
   *   • No match → after 650 ms clear flippedIds (cards flip back face-down).
   *              The longer delay gives the player time to memorise the icons.
   * In both cases isResolving is reset to false once the timeout fires.
   */
  const flipCard = (card) => {
    // Ignore click if animating, card is already matched, same card, or two
    // cards are already showing.
    if (isResolving || card.matched || flippedIds.includes(card.id) || flippedIds.length >= 2) return;

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    // Only evaluate a match once the second card has been flipped.
    if (nextFlipped.length === 2) {
      setIsResolving(true); // lock the board while resolving
      setMoves((m) => m + 1); // count this as one move attempt

      const [firstId, secondId] = nextFlipped;
      const first = deck.find((c) => c.id === firstId);
      const second = deck.find((c) => c.id === secondId);

      if (first && second && first.icon === second.icon) {
        // ── Match found ──────────────────────────────────────────────────────
        // Short delay so the player can see both icons before they lock in.
        setTimeout(() => {
          setDeck((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? {
                    ...c,
                    matched: true, // permanently reveal this pair
                  }
                : c
            )
          );
          setFlippedIds([]);
          setIsResolving(false);
        }, 280);
      } else {
        // ── No match ─────────────────────────────────────────────────────────
        // Longer delay gives the player time to memorise the positions before
        // the cards flip back face-down.
        setTimeout(() => {
          setFlippedIds([]);
          setIsResolving(false);
        }, 650);
      }
    }
  };

  /**
   * restart — resets all state back to the start of a new game.
   * makeDeck() is called again so the cards are reshuffled into a new order.
   */
  const restart = () => {
    setDeck(makeDeck());
    setFlippedIds([]);
    setMoves(0);
    setIsResolving(false);
  };

  return (
    <article className="game-page memory-page" data-testid="memory-page">
      <header className="game-page-header">
        <h1 className="game-page-title">Memory Cards</h1>
        <p className="game-page-player" data-testid="memory-player-label">
          {playerName ? `${playerName}, match all pairs` : "Match all pairs"}
        </p>
      </header>

      <div className="memory-panel">
        {/* Live stats bar — moves and pairs found update after every flip */}
        <div className="memory-stats">
          <div className="memory-stat">
            <span className="memory-stat-label">Moves</span>
            <strong className="memory-stat-value" data-testid="memory-moves">
              {moves}
            </strong>
          </div>
          <div className="memory-stat">
            <span className="memory-stat-label">Pairs found</span>
            <strong className="memory-stat-value" data-testid="memory-pairs">
              {matchedCount}/{ICONS.length}
            </strong>
          </div>
        </div>

        <div className="memory-grid" role="grid" aria-label="Memory cards board">
          {deck.map((card, index) => {
            // A card is considered "flipped" (showing its icon) if it has been
            // permanently matched OR if its id is in the temporary flippedIds list.
            const isFlipped = card.matched || flippedIds.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                // CSS classes drive the 3-D flip animation:
                //   memory-card--flipped  → rotates the card to show the icon
                //   memory-card--matched  → adds a green glow to matched pairs
                className={`memory-card${isFlipped ? " memory-card--flipped" : ""}${
                  card.matched ? " memory-card--matched" : ""
                }`}
                onClick={() => flipCard(card)}
                data-testid={`memory-card-${index}`}
                aria-label={`Memory card ${index + 1}`}
                // Disable hidden cards while the board is resolving so the
                // player can't flip a third card mid-animation.
                disabled={isResolving && !isFlipped}
              >
                {/* Front face: shown while the card is face-down */}
                <span className="memory-card-face memory-card-face--front" aria-hidden="true">
                  ?
                </span>
                {/* Back face: revealed when the card is flipped */}
                <span className="memory-card-face memory-card-face--back" aria-hidden="true">
                  {card.icon}
                </span>
              </button>
            );
          })}
        </div>

        {/* Win message — only rendered once every pair has been matched */}
        {allMatched ? (
          <p className="memory-win" data-testid="memory-win">
            Great memory. You cleared the board in {moves} {moves === 1 ? "move" : "moves"}.
          </p>
        ) : null}

        <button type="button" className="btn btn-ghost" onClick={restart} data-testid="memory-reset">
          Shuffle and restart
        </button>
      </div>
    </article>
  );
}