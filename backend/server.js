// server.js
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const colors = require("colors");
const fileUpload = require("express-fileupload");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const { Server } = require("socket.io");

// DB & models
const connectDB = require("./config/db");
const Lead = require("./models/Lead");

// middleware
const errorHandler = require("./middleware/error");
const sanitizeInput = require("./middleware/sanitizeInput");
const callerController = require("./controllers/callerController");

// routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const notificationRoutes = require("./routes/notificationRoutes");
const leadRoutes = require("./routes/leadRoutes");
const callerRoutes = require("./routes/callerRoutes");
const activityRoutes = require("./routes/activityRoutes");
const callRoutes = require("./routes/callRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const fieldConfigRoutes = require("./routes/fieldConfigRoutes");
const bookingFieldRoutes = require("./routes/bookingFieldRoutes");
const leadStageRoutes = require("./routes/leadStageRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const filterTemplateRoutes = require("./routes/filterTemplateRoutes");
const integrationRoutes = require("./routes/integrationRoutes");
const waTemplateRoutes = require("./routes/waTemplateRoutes");
const alarmRoutes = require("./routes/alarms");
const exportRoutes = require("./routes/export");
const roleRoutes = require("./routes/roleRoutes");
const teamRoutes = require("./routes/teamRoutes");

// integrations
const { syncMetaLeads, syncMetaCampaigns } = require("./services/metaLeadSyncService");

// utils
const { room, attachSocketDebug, safeEmit } = require("./utils/socket");

// ------------------------------------
// Connect DB
// ------------------------------------
connectDB();

// ------------------------------------
// Express app
// ------------------------------------
const app = express();

// ------------------------------------
// CORS (RN SAFE)
// ------------------------------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://medagg-crm.vercel.app",
  "https://www.ardpgimerchd.org",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.set("trust proxy", 1);

// ------------------------------------
// 🚨 FILE UPLOAD — MUST BE FIRST 🚨
// ------------------------------------
app.use(
  fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// ------------------------------------
// Body parsers (AFTER file upload)
// ------------------------------------
app.use(express.json({ limit: "2gb" }));
app.use(express.urlencoded({ extended: true, limit: "2gb" }));
app.use(cookieParser());

// ------------------------------------
// HTTP Server + Socket.IO
// ------------------------------------
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  path: "/socket.io",
  pingTimeout: 25000,
  pingInterval: 20000,
});

// ---- Socket auth ----
io.use((socket, next) => {
  try {
    const headerToken = (socket.handshake.headers?.authorization || "").replace(
      /^Bearer\s+/i,
      ""
    );
    const token = socket.handshake.auth?.token || headerToken;

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      _id: decoded.id,
      roleName: String(decoded.roleName || "").toLowerCase(),
    };
    next();
  } catch (e) {
    next();
  }
});

app.set("io", io);
attachSocketDebug(io);

io.on("connection", (socket) => {
  if (socket.user?._id) {
    socket.join(room.caller(socket.user._id));
  }

  socket.on("disconnect", (reason) => {
    console.log("🔴 socket disconnected:", reason);
  });
});

// ------------------------------------
// Security & performance
// ------------------------------------
app.disable("etag");

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.set("Cache-Control", "no-store");
  }
  next();
});

app.use(sanitizeInput);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(hpp());

// Rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
});
app.use("/api", limiter);

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ------------------------------------
// Static
// ------------------------------------
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads/lead_documents", express.static(path.join(__dirname, "uploads/lead_documents")));

// ------------------------------------
// API Routes
// ------------------------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/caller", callerRoutes);
app.use("/api/v1/activities", activityRoutes);
app.use("/api/v1/calls", callRoutes);
app.use("/api/v1/campaigns", campaignRoutes);
app.use("/api/v1/lead-fields", fieldConfigRoutes);
app.use("/api/v1/booking-fields", bookingFieldRoutes);
app.use("/api/v1/lead-stages", leadStageRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/filter-templates", filterTemplateRoutes);
app.use("/api/v1/integrations", integrationRoutes);
app.use("/api/v1/wa-templates", waTemplateRoutes);
app.use("/api/v1/alarms", alarmRoutes);
app.use("/api/v1/export", exportRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/teams", teamRoutes);

// ------------------------------------
// Frontend Static Files (Production)
// ------------------------------------
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api/")) {
      res.sendFile(path.resolve(__dirname, "../frontend/dist", "index.html"));
    }
  });
}

// ------------------------------------
// Error handler
// ------------------------------------
app.use(errorHandler);

// ------------------------------------
// Start server
// ------------------------------------
const PORT = process.env.PORT || 5013;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 Server running on port ${PORT} (listening on 0.0.0.0)`.green.bold
  );
});

// ------------------------------------
// Meta Lead Sync Cron (optional)
// ------------------------------------
let metaSyncRunning = false;
async function runMetaSync(reason) {
  if (metaSyncRunning) {
    console.log(`[meta-sync] skipped (${reason}): already running`);
    return;
  }
  metaSyncRunning = true;
  try {
    // 1. Sync Campaigns first so leads can link to them
    await syncMetaCampaigns();
    // 2. Sync Leads
    const summary = await syncMetaLeads();
    console.log(`[meta-sync] completed (${reason})`, summary);
  } catch (err) {
    console.error(
      `[meta-sync] failed (${reason}):`,
      err?.response?.data?.error?.message || err?.message || String(err)
    );
  } finally {
    metaSyncRunning = false;
  }
}

if (String(process.env.META_SYNC_ENABLED || "").toLowerCase() === "true") {
  const schedule = process.env.META_SYNC_CRON || "*/10 * * * *";
  try {
    cron.schedule(schedule, () => runMetaSync("cron"), { timezone: "UTC" });
    console.log(`[meta-sync] cron scheduled: ${schedule} (UTC)`);
  } catch (e) {
    console.error("[meta-sync] invalid cron schedule:", schedule, e?.message || e);
  }

  // Optional: run once on boot (after server up)
  if (String(process.env.META_SYNC_RUN_ON_START || "").toLowerCase() === "true") {
    setTimeout(() => runMetaSync("startup"), 5000);
  }
}

// ------------------------------------
// Graceful shutdown
// ------------------------------------
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err.message);
  httpServer.close(() => process.exit(1));
});