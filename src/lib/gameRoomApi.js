const BASE = "https://game-room-api.fly.dev";

/**
 * @param {unknown} initialState
 * @returns {Promise<{ roomId: string; gameState: unknown }>}
 */
export async function apiCreateRoom(initialState) {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initialState }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Failed to create room");
  }
  return res.json();
}

/**
 * @param {string} roomId
 * @returns {Promise<{ id: string; gameState: unknown; createdAt?: string }>}
 */
export async function apiGetRoom(roomId) {
  const res = await fetch(`${BASE}/api/rooms/${encodeURIComponent(roomId)}`);
  if (!res.ok) throw new Error("Room not found");
  return res.json();
}

/**
 * @param {string} roomId
 * @param {unknown} gameState
 */
export async function apiUpdateRoom(roomId, gameState) {
  const res = await fetch(`${BASE}/api/rooms/${encodeURIComponent(roomId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameState }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Failed to update room");
  }
  return res.json();
}

export const createRoom = apiCreateRoom;
export const getRoom = apiGetRoom;
export const updateRoom = apiUpdateRoom;
