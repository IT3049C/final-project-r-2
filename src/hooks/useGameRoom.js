import { useEffect, useState } from "react";
import { apiGetRoom } from "../lib/gameRoomApi.js";

/**
 * Polls GET /api/rooms/:roomId while roomId is set.
 * @param {{ pollMs?: number; hiddenPollMs?: number }} [options]
 */
export function useGameRoom(options = {}) {
  const pollMs = options.pollMs ?? 1000;
  const hiddenPollMs = options.hiddenPollMs ?? 4000;
  const [roomId, setRoomId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) {
      setGameState(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await apiGetRoom(roomId);
        if (!cancelled) {
          setGameState(data.gameState);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };

    poll();

    const tick = () => {
      const ms = document.hidden ? hiddenPollMs : pollMs;
      return window.setInterval(poll, ms);
    };

    let intervalId = tick();

    const onVisibility = () => {
      window.clearInterval(intervalId);
      poll();
      intervalId = tick();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [roomId, pollMs, hiddenPollMs]);

  return { roomId, setRoomId, gameState, error };
}
