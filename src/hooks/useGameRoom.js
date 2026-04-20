import { useState, useEffect, useRef, useCallback } from "react";
import { createRoom, getRoom, updateRoom } from "../lib/gameRoomApi.js";

/**
 * useGameRoom — a lightweight polling hook that wraps the Game Room API.
 *
 * How it works (the "near real-time" model):
 *   - One player creates a room; everyone else joins by entering the room code.
 *   - Every `refetchInterval` ms this hook fetches the room's latest gameState
 *     from the server, so all clients see each other's moves without WebSockets.
 *   - When a player makes a move they call `pushState`, which writes the new
 *     snapshot to the server. The next poll on every client picks it up.
 *
 * Tradeoff: polling adds ~0–1 s of perceived latency between moves.
 * That is acceptable for a turn-based game like Tic Tac Toe.
 *
 * @param {{ refetchInterval?: number }} options
 *   refetchInterval – how often (ms) to poll the server (default 1000).
 */
export function useGameRoom({ refetchInterval = 1000 } = {}) {
  const [roomId, setRoomId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep a stable ref to the interval so we can cancel it on cleanup.
  const pollRef = useRef(null);

  // Start (or restart) polling whenever the room changes.
  useEffect(() => {
    // No room yet — clear any running interval and bail.
    if (!roomId) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    // Fetch once immediately so the UI doesn't wait a full interval.
    const poll = async () => {
      try {
        const data = await getRoom(roomId);
        setGameState(data.gameState);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };

    poll();
    // Then keep polling on a fixed interval.
    pollRef.current = setInterval(poll, refetchInterval);

    // Clean up when the component unmounts or roomId/interval changes.
    return () => clearInterval(pollRef.current);
  }, [roomId, refetchInterval]);

  /**
   * Create a brand-new room with the given initial state.
   * Sets roomId internally so polling starts automatically.
   */
  const startRoom = useCallback(async (initialState) => {
    setIsLoading(true);
    setError(null);
    try {
      const { roomId: rId, gameState: gs } = await createRoom(initialState);
      setGameState(gs);
      setRoomId(rId); // triggers the polling useEffect above
      return rId;
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Join an existing room by entering its code.
   * Just sets roomId; the polling useEffect does the rest.
   */
  const joinRoom = useCallback((rId) => {
    setError(null);
    setGameState(null); // clear stale state from a previous room
    setRoomId(rId.toUpperCase());
  }, []);

  /**
   * Write a new game state snapshot to the server.
   *
   * Conflict strategy — "version bump":
   *   We include a monotonically increasing `version` number in every state.
   *   `pushState` increments it by one before writing, giving each write a
   *   unique marker.  Because only the player whose turn it is calls this,
   *   simultaneous writes are extremely unlikely in a turn-based game.
   */
  const pushState = useCallback(
    async (nextState) => {
      if (!roomId) return;
      try {
        // Bump version so both sides can detect a new write during reconciliation.
        const toSend = { ...nextState, version: (nextState.version ?? 0) + 1 };
        const updated = await updateRoom(roomId, toSend);
        // Optimistically update local state so the UI feels instant.
        setGameState(updated.gameState);
        return updated.gameState;
      } catch (err) {
        setError(err.message);
      }
    },
    [roomId]
  );

  return { roomId, gameState, isLoading, error, startRoom, joinRoom, pushState };
}
