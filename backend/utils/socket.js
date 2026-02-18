// backend/utils/socket.js
const util = require("util");

const room = {
  caller: (userId) => (userId ? `caller:${userId}` : null),
  lead:   (leadId)  => (leadId ?  `lead:${leadId}`  : null),
  admins: "admins",
};

/**
 * Emit to rooms and print to terminal.
 * If no sockets are in the target rooms, fallback-broadcast to everyone.
 *
 * safeEmit(io, event, payload, { to, includeAdmins=true, broadcastOnZero=true })
 */
function safeEmit(io, event, payload, opts = {}) {
  const {
    to,
    includeAdmins = true,
    broadcastOnZero = true,
  } = opts || {};

  // collect targets
  const targets = [];
  if (Array.isArray(to)) {
    to.filter(Boolean).forEach((t) => targets.push(String(t)));
  } else if (to) {
    targets.push(String(to));
  }
  if (includeAdmins) targets.push(room.admins);

  const uniqTargets = [...new Set(targets.filter(Boolean))];

  // estimate listeners per room (log only)
  let delivered = 0;
  const perRoom = {};
  try {
    const adapterRooms = io.sockets.adapter.rooms;
    uniqTargets.forEach((r) => {
      const set = adapterRooms.get(r);
      const n = set ? set.size : 0;
      perRoom[r] = n;
      delivered += n;
    });
  } catch { /* noop */ }

  const payloadKeys =
    payload && typeof payload === "object" ? Object.keys(payload).slice(0, 8) : [];

  console.log(
    "[socket:emit]",
    util.inspect(
      {
        event,
        
        targets: uniqTargets.length ? uniqTargets : ["<broadcast>"],
        perRoom,
        delivered,
        payloadKeys,
      },
      { colors: true, depth: 2 }
    )
  );

  // actual emit
  if (!uniqTargets.length) {
    io.emit(event, payload);
    return;
  }

  if (delivered === 0 && broadcastOnZero) {
    console.log(`[socket:emit:fallback] broadcasting '${event}' to all (no listeners in target rooms)`);
    io.emit(event, payload);
    return;
  }

  uniqTargets.forEach((r) => io.to(r).emit(event, payload));
}

/** Minimal connection logs. Call once after creating `io`. */
function attachSocketDebug(io) {
  const debugOn = /^(1|true|yes|verbose)$/i.test(String(process.env.SOCKET_DEBUG || ""));
  if (!debugOn) return;

  io.on("connection", (socket) => {
    const uid = socket.user?._id || "anon";
    const role = socket.user?.role || "unknown";
    console.log(`[socket] connected ${socket.id} uid=${uid} role=${role}`);

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected ${socket.id} reason=${reason}`);
    });

    socket.onAny((event, ...args) => {
      if (event.startsWith("internal:")) return;
      console.log(`[socket:req] ${socket.id} -> ${event}`, args?.[0] ?? "");
    });
  });
}

module.exports = { room, safeEmit, attachSocketDebug };
