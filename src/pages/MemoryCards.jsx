import { useMemo, useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";

const ICONS = ["🍎", "🚀", "🎧", "🌟", "⚽", "🎲"];

function makeDeck() {
  const cards = ICONS.flatMap((icon) => [
    { id: `${icon}-a`, icon, matched: false },
    { id: `${icon}-b`, icon, matched: false },
  ]);

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

export function MemoryCards() {
  const { playerName } = usePlayer();
  const [deck, setDeck] = useState(() => makeDeck());
  const [flippedIds, setFlippedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [isResolving, setIsResolving] = useState(false);

  const matchedCount = useMemo(() => deck.filter((c) => c.matched).length / 2, [deck]);
  const allMatched = matchedCount === ICONS.length;

  const flipCard = (card) => {
    if (isResolving || card.matched || flippedIds.includes(card.id) || flippedIds.length >= 2) return;

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setIsResolving(true);
      setMoves((m) => m + 1);

      const [firstId, secondId] = nextFlipped;
      const first = deck.find((c) => c.id === firstId);
      const second = deck.find((c) => c.id === secondId);

      if (first && second && first.icon === second.icon) {
        setTimeout(() => {
          setDeck((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? {
                    ...c,
                    matched: true,
                  }
                : c
            )
          );
          setFlippedIds([]);
          setIsResolving(false);
        }, 280);
      } else {
        setTimeout(() => {
          setFlippedIds([]);
          setIsResolving(false);
        }, 650);
      }
    }
  };

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
            const isFlipped = card.matched || flippedIds.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                className={`memory-card${isFlipped ? " memory-card--flipped" : ""}${
                  card.matched ? " memory-card--matched" : ""
                }`}
                onClick={() => flipCard(card)}
                data-testid={`memory-card-${index}`}
                aria-label={`Memory card ${index + 1}`}
                disabled={isResolving && !isFlipped}
              >
                <span className="memory-card-face memory-card-face--front" aria-hidden="true">
                  ?
                </span>
                <span className="memory-card-face memory-card-face--back" aria-hidden="true">
                  {card.icon}
                </span>
              </button>
            );
          })}
        </div>

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