// src/utils/socket.js
import { io } from "socket.io-client";

// ---- WHY these defaults? ----
// • window.location.origin keeps FE/BE aligned in prod behind Nginx.
// • You can still override with VITE_SOCKET_URL during local dev.
const FALLBACK_URL =
  "http://localhost:5013";

const SOCKET_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SOCKET_URL) ||
  (typeof window !== "undefined" ? window.location.origin : FALLBACK_URL);

const SOCKET_PATH = "/socket.io"; // must match server

let socket = null;
let hasInit = false;

export const initializeSocket = () => {
  if (hasInit && socket) return socket;

  // read token once here; connect() can refresh it later
  let token = "";
  try {
    token = localStorage.getItem("token") || "";
  } catch { }

  socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    // auth is the canonical way to pass JWT to server's io.use(...)
    auth: { token },
    // Allow polling fallback for proxies; websocket preferred first
    transports: ["websocket", "polling"],
    autoConnect: false,            // explicit connect to avoid StrictMode races
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 600,
    timeout: 15000,
    withCredentials: false,        // set true ONLY if you swap to cookie-based auth
  });

  // helpful logs
  socket.on("connect", () => console.log("[socket] connected:", socket.id));
  socket.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));
  socket.on("connect_error", (err) =>
    console.warn("[socket] connect_error:", err?.message || err)
  );

  // optional: one-time health check response
  socket.on("internal:welcome", (d) => console.log("[socket] welcome:", d));

  hasInit = true;
  return socket;
};

export const getSocket = () => socket || null;

/**
 * Connect (or reconnect) with an optional fresh token.
 * Safe to call multiple times.
 */
export const connectSocket = (tokenFromCaller) => {
  const s = initializeSocket();

  // Refresh token for the NEXT handshake
  if (tokenFromCaller) s.auth = { token: tokenFromCaller };
  else {
    try {
      const tk = localStorage.getItem("token") || "";
      s.auth = { token: tk };
    } catch {
      s.auth = { token: "" };
    }
  }

  if (!s.connected && s.disconnected) s.connect();
  return s;
};

/** Update auth token for next (re)connect without disconnecting now. */
export const setSocketToken = (token) => {
  const s = initializeSocket();
  s.auth = { token: token || "" };
};

/** Only call this on explicit logout/app exit. */
export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};

/** Convenience: wait until connected (resolve quickly if already connected). */
export const waitForConnect = () =>
  new Promise((resolve) => {
    const s = initializeSocket();
    if (s.connected) return resolve(s);
    const onConnect = () => {
      s.off("connect", onConnect);
      resolve(s);
    };
    s.on("connect", onConnect);
    if (s.disconnected) s.connect();
  });

/** Join/leave lead rooms (matches your server-side handlers) */
export const joinLeadRoom = async (leadId) => {
  const s = await waitForConnect();
  s.emit("lead:join", { leadId: String(leadId) });
};
export const leaveLeadRoom = async (leadId) => {
  const s = await waitForConnect();
  s.emit("lead:leave", { leadId: String(leadId) });
};
