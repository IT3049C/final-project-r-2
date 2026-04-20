import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlayer } from "../context/PlayerContext.jsx";
import { useGameRoom } from "../hooks/useGameRoom.js";
import { apiCreateRoom, apiGetRoom, apiUpdateRoom } from "../lib/gameRoomApi.js";

const CHOICES = [
  { id: "rock", label: "Rock", emoji: "✊" },
  { id: "paper", label: "Paper", emoji: "✋" },
  { id: "scissors", label: "Scissors", emoji: "✌️" },
];

function createInitialState() {
  return {
    version: 0,
    players: [],
    picks: {},
    scores: {},
    ties: 0,
    lastRound: null,
    updatedAt: Date.now(),
  };
}

/** @param {string} pickA @param {string} pickB @param {string} idA @param {string} idB */
function resolveWinner(pickA, pickB, idA, idB) {
  if (pickA === pickB) return "tie";
  if (
    (pickA === "rock" && pickB === "scissors") ||
    (pickA === "paper" && pickB === "rock") ||
    (pickA === "scissors" && pickB === "paper")
  ) {
    return idA;
  }
  return idB;
}

/**
 * @param {string} roomCode
 * @param {string} pid
 * @param {string} name
 */
async function ensurePlayerInRoom(roomCode, pid, name) {
  const { gameState: gs } = await apiGetRoom(roomCode);
  if (gs.players?.some((p) => p.id === pid)) {
    return gs;
  }
  if (gs.players?.length >= 2) {
    throw new Error("This room already has two players.");
  }
  const nextPlayers = [...(gs.players || []), { id: pid, name: name || "Player" }];
  const scores = { ...(gs.scores || {}) };
  for (const p of nextPlayers) {
    if (scores[p.id] === undefined) scores[p.id] = 0;
  }
  const picks = { ...(gs.picks || {}) };
  const next = {
    ...gs,
    players: nextPlayers,
    scores,
    picks,
    version: (gs.version ?? 0) + 1,
    updatedAt: Date.now(),
    updatedBy: pid,
  };
  const res = await apiUpdateRoom(roomCode, next);
  return res.gameState;
}

export function RockPaperScissorsMultiplayer() {
  const { playerName } = usePlayer();
  const displayName = useMemo(() => playerName?.trim() || "Player", [playerName]);
  const [playerId, setPlayerId] = useState(null);
  const { roomId, setRoomId, gameState, error } = useGameRoom({
    pollMs: 1000,
    hiddenPollMs: 4500,
  });
  const [roomInput, setRoomInput] = useState("");
  const [joinError, setJoinError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const KEY = "gamehub-rps-mp-player-id";
    try {
      let id = sessionStorage.getItem(KEY);
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(KEY, id);
      }
      setPlayerId(id);
    } catch {
      setPlayerId(crypto.randomUUID());
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!playerId) return;
    setBusy(true);
    setJoinError(null);
    try {
      const { roomId: id } = await apiCreateRoom(createInitialState());
      await ensurePlayerInRoom(id, playerId, displayName);
      setRoomInput(id);
      setRoomId(id);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [playerId, displayName, setRoomId]);

  const handleJoin = useCallback(async () => {
    const code = roomInput.trim().toUpperCase();
    if (!code || !playerId) return;
    setBusy(true);
    setJoinError(null);
    try {
      await ensurePlayerInRoom(code, playerId, displayName);
      setRoomId(code);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [roomInput, playerId, displayName, setRoomId]);

  const handleLeave = useCallback(() => {
    setRoomId(null);
    setRoomInput("");
    setJoinError(null);
  }, [setRoomId]);

  const submitPick = useCallback(
    async (choice) => {
      if (!roomId || !playerId) return;
      setBusy(true);
      try {
        const latest = await apiGetRoom(roomId);
        const state = latest.gameState;
        if (state.picks?.[playerId]) return;

        const picks = { ...(state.picks || {}), [playerId]: choice };
        const ids = state.players.map((p) => p.id);
        const baseV = state.version ?? 0;

        let next = {
          ...state,
          picks,
          version: baseV + 1,
          updatedAt: Date.now(),
          updatedBy: playerId,
        };

        if (ids.length === 2 && picks[ids[0]] && picks[ids[1]]) {
          const [a, b] = ids;
          const pa = picks[a];
          const pb = picks[b];
          const w = resolveWinner(pa, pb, a, b);
          const scores = { ...(state.scores || {}) };
          scores[a] = scores[a] ?? 0;
          scores[b] = scores[b] ?? 0;
          let ties = state.ties ?? 0;
          if (w === "tie") ties += 1;
          else scores[w] = (scores[w] ?? 0) + 1;
          next = {
            ...next,
            scores,
            ties,
            lastRound: { winner: w, picks: { [a]: pa, [b]: pb } },
            picks: { [a]: null, [b]: null },
            version: baseV + 1,
          };
        }

        await apiUpdateRoom(roomId, next);
      } catch (e) {
        setJoinError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [roomId, playerId],
  );

  const copyCode = useCallback(async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setJoinError("Could not copy to clipboard.");
    }
  }, [roomId]);

  const players = gameState?.players ?? [];
  const ready = players.length === 2;
  const me = players.find((p) => p.id === playerId);
  const opp = players.find((p) => p.id !== playerId);
  const myPick = gameState?.picks?.[playerId];
  const oppPick = opp ? gameState?.picks?.[opp.id] : null;
  const last = gameState?.lastRound;
  const ties = gameState?.ties ?? 0;

  let status = "Join or create a room to play online.";
  if (roomId && !ready) status = "Waiting for a second player to join…";
  if (ready && myPick && !oppPick) {
    status = `You locked in. Waiting for ${opp?.name ?? "opponent"}…`;
  } else if (ready && !myPick && !oppPick) {
    const recap =
      last == null
        ? ""
        : last.winner === "tie"
          ? "Last round was a tie. "
          : last.winner === playerId
            ? "You won the last round. "
            : `${opp?.name ?? "Opponent"} won the last round. `;
    status = `${recap}Pick rock, paper, or scissors.`;
  }

  return (
    <div className="rps-mp" data-testid="rps-mp-panel">
      {!roomId ? (
        <div className="rps-mp-lobby">
          <p className="rps-mp-intro">
            Create a room and share the code, or enter a friend&apos;s code to join. The game state
            syncs via the class Game Room API (polling ~1s).
          </p>
          <div className="rps-mp-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !playerId}
              onClick={handleCreate}
              data-testid="rps-mp-create"
            >
              Create room
            </button>
          </div>
          <div className="rps-mp-join">
            <label className="rps-mp-label" htmlFor="rps-room-input">
              Room code
            </label>
            <div className="rps-mp-join-row">
              <input
                id="rps-room-input"
                className="rps-mp-input"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                autoComplete="off"
                spellCheck={false}
                data-testid="rps-mp-room-input"
              />
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy || !playerId || !roomInput.trim()}
                onClick={handleJoin}
                data-testid="rps-mp-join"
              >
                Join
              </button>
            </div>
          </div>
          {(joinError || error) && (
            <p className="rps-mp-error" role="alert">
              {joinError || error}
            </p>
          )}
        </div>
      ) : (
        <div className="rps-mp-game">
          <div className="rps-mp-roombar">
            <p className="rps-mp-roomline">
              Room <code className="rps-mp-code">{roomId}</code>
              <button type="button" className="btn btn-ghost rps-mp-copy" onClick={copyCode}>
                {copied ? "Copied" : "Copy"}
              </button>
            </p>
            <button type="button" className="btn btn-ghost" onClick={handleLeave} data-testid="rps-mp-leave">
              Leave room
            </button>
          </div>

          <div className="rps-score rps-mp-scores">
            <div>
              <span className="rps-score-label">{me?.name ?? "You"}</span>
              <span className="rps-score-value" data-testid="rps-mp-score-me">
                {me ? (gameState?.scores?.[me.id] ?? 0) : "—"}
              </span>
            </div>
            <div>
              <span className="rps-score-label">Ties</span>
              <span className="rps-score-value" data-testid="rps-mp-ties">
                {ready ? ties : "—"}
              </span>
            </div>
            <div>
              <span className="rps-score-label">{opp?.name ?? "Opponent"}</span>
              <span className="rps-score-value" data-testid="rps-mp-score-opp">
                {opp ? (gameState?.scores?.[opp.id] ?? 0) : "—"}
              </span>
            </div>
          </div>

          <p className="rps-last" data-testid="rps-mp-status" aria-live="polite">
            {status}
          </p>

          {ready ? (
            <>
              <div className="rps-choices">
                {CHOICES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="rps-btn"
                    disabled={busy || Boolean(myPick)}
                    onClick={() => submitPick(c.id)}
                    aria-pressed={myPick === c.id}
                    data-testid={`rps-mp-${c.id}`}
                  >
                    <span className="rps-btn-emoji" aria-hidden="true">
                      {c.emoji}
                    </span>
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="rps-detail" data-testid="rps-mp-detail">
                {myPick ? (
                  <>
                    You: <strong>{CHOICES.find((x) => x.id === myPick)?.label}</strong>
                    {" · "}
                    {oppPick ? (
                      <>
                        {opp?.name}:{" "}
                        <strong>{CHOICES.find((x) => x.id === oppPick)?.label}</strong>
                      </>
                    ) : (
                      <span>{opp?.name} still choosing…</span>
                    )}
                  </>
                ) : (
                  "Your move is hidden until both players have chosen."
                )}
              </p>
            </>
          ) : null}

          {(joinError || error) && (
            <p className="rps-mp-error" role="alert">
              {joinError || error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
