// Base URL for the Game Room API hosted by Prof. Yahya Gilany.
// All game state is stored as arbitrary JSON, so this same file can be
// reused for any multiplayer game (Connect Four, Battleship, Word Guess, …).
const BASE = "https://game-room-api.fly.dev";

/**
 * Create a brand-new room and seed it with `initialState`.
 * Returns { roomId, gameState } — share roomId with opponents.
 */
export async function createRoom(initialState) {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initialState }),
  });
  if (!res.ok) throw new Error("Failed to create room");
  return res.json(); // { roomId: string, gameState: object }
}

/**
 * Read the current state of a room by its code.
 * Returns { id, createdAt, gameState }.
 * Called repeatedly by the polling loop so all clients stay in sync.
 */
export async function getRoom(roomId) {
  const res = await fetch(`${BASE}/api/rooms/${roomId}`);
  if (!res.ok) throw new Error("Room not found");
  return res.json(); // { id, createdAt, gameState }
}

/**
 * Overwrite the room's game state with a new snapshot.
 * Returns the updated room object (including the new gameState).
 * Only the player whose turn it is should call this, which prevents most conflicts.
 */
export async function updateRoom(roomId, gameState) {
  const res = await fetch(`${BASE}/api/rooms/${roomId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameState }),
  });
  if (!res.ok) throw new Error("Failed to update room");
  return res.json(); // updated room
}
