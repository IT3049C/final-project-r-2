import { useEffect, useState, useCallback, useRef } from "react";
import { apiCreateRoom, apiGetRoom, apiUpdateRoom } from "../lib/gameRoomApi.js";

/**
 * Polls GET /api/rooms/:roomId while roomId is set.
 * Supports both { pollMs, hiddenPollMs } and { refetchInterval } options.
 */
export function useGameRoom(options = {}) {
  const pollMs = options.pollMs ?? options.refetchInterval ?? 1000;
  const hiddenPollMs = options.hiddenPollMs ?? 4000;

  const [roomId, setRoomId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!roomId) {
      setGameState(null);
      setError(null);
      if (pollRef.current) window.clearInterval(pollRef.current);
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

    pollRef.current = tick();

    const onVisibility = () => {
      window.clearInterval(pollRef.current);
      poll();
      pollRef.current = tick();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [roomId, pollMs, hiddenPollMs]);

  const startRoom = useCallback(async (initialState) => {
    setIsLoading(true);
    setError(null);
    try {
      const { roomId: rId, gameState: gs } = await apiCreateRoom(initialState);
      setGameState(gs);
      setRoomId(rId);
      return rId;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinRoom = useCallback((rId) => {
    setError(null);
    setGameState(null);
    setRoomId(typeof rId === "string" ? rId.toUpperCase() : null);
  }, []);

  const pushState = useCallback(
    async (nextState) => {
      if (!roomId) return;
      try {
        const toSend = { ...nextState, version: (nextState?.version ?? 0) + 1 };
        const updated = await apiUpdateRoom(roomId, toSend);
        setGameState(updated.gameState);
        setError(null);
        return updated.gameState;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [roomId],
  );

  return {
    roomId,
    setRoomId,
    gameState,
    isLoading,
    error,
    startRoom,
    joinRoom,
    pushState,
  };
}
