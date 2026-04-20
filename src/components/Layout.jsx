import { Link, Outlet, useLocation } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext.jsx";
import { useTheme } from "../hooks/useTheme.js";

export function Layout() {
  const { playerName } = usePlayer();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-logo">
            <span className="app-logo-mark" aria-hidden="true">
              ◆
            </span>
            Game Hub
          </Link>
          <nav className="app-nav" aria-label="Main">
            {!isHome ? (
              <Link to="/" className="nav-link">
                All games
              </Link>
            ) : null}
          </nav>
          {playerName ? (
            <p className="player-greeting" data-testid="player-greeting">
              Player: <strong>{playerName}</strong>
            </p>
          ) : (
            <p className="player-greeting player-greeting--pending" data-testid="player-greeting">
              Player: …
            </p>
          )}
          {/* Light / dark mode toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
