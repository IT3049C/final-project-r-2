import { Link } from "react-router-dom";

const games = [
  {
    id: "rock-paper-scissors",
    title: "Rock Paper Scissors",
    path: "/games/rock-paper-scissors",
    blurb: "Classic showdown against the computer. First to five wins the set.",
    icon: "✊",
    testId: "game-card-rps",
  },
  {
    id: "typing-speed",
    title: "Typing Speed Test",
    path: "/games/typing-speed",
    blurb: "Race the clock and sharpen your words-per-minute on a short passage.",
    icon: "⌨️",
    testId: "game-card-typing",
  },
  {
    id: "wordle",
    title: "Wordle",
    path: "/games/wordle",
    blurb: "Guess a hidden five-letter word in six tries with colored hints each round.",
    icon: "W",
    testId: "game-card-wordle",
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    path: "/games/tic-tac-toe",
    blurb: "Take turns on a 3x3 board. Connect three in a row before your opponent.",
    icon: "#",
    testId: "game-card-ttt",
  },
  {
    id: "memory-cards",
    title: "Memory Cards",
    path: "/games/memory-cards",
    blurb: "Flip two cards at a time, match all pairs, and finish with the fewest moves.",
    icon: "🃏",
    testId: "game-card-memory",
  },
];

export function Home() {
  return (
    <div className="home" data-testid="landing">
      <section className="hero">
        <h1 className="hero-title">Pick a game</h1>
        <p className="hero-sub">
          Five mini games in one place. Enter your name once (you’ll be prompted), then pick a card
          below. Your name follows you on every screen.
        </p>
      </section>

      <ul className="game-grid">
        {games.map((g) => (
          <li key={g.id}>
            <Link to={g.path} className="game-card" data-testid={g.testId}>
              <span className="game-card-icon" aria-hidden="true">
                {g.icon}
              </span>
              <h2 className="game-card-title">{g.title}</h2>
              <p className="game-card-blurb">{g.blurb}</p>
              <span className="game-card-cta">Play →</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="developers" data-testid="developers-section" aria-labelledby="dev-heading">
        <h2 id="dev-heading" className="developers-title">
          Developers
        </h2>
        <p className="developers-intro">
          Game Hub was built as a final project by:
        </p>
        <ul className="developers-list">
          <li data-testid="developer-riddhi">Riddhi Mahajan</li>
          <li data-testid="developer-rohit">Rohit Vijai</li>
        </ul>
      </section>
    </div>
  );
}
