/* eslint-disable react-refresh/only-export-components -- context + hook pattern */
import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "gamehub-player-name";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [playerName, setPlayerNameState] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored?.trim()) setPlayerNameState(stored.trim());
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setPlayerName = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
    setPlayerNameState(trimmed);
  };

  return (
    <PlayerContext.Provider value={{ playerName, setPlayerName, ready }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
