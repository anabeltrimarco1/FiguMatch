import groupRoutes from "./routes/groups.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import importExcelRoutes from "./routes/importExcel.js";
import authRoutes from "./routes/auth.js";
import stickerRoutes from "./routes/stickers.js";
import albumRoutes from "./routes/album.js";
import matchRoutes from "./routes/matches.js";
import messageRoutes from "./routes/messages.js";
import teamsRoutes from "./routes/teams.js";
import tradeRequestsRoutes from "./routes/tradeRequests.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: corsOrigin },
});
app.set("io", io);

app.use("/api/groups", groupRoutes);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  "/stickers-images",
  express.static(path.join(__dirname, "../public/stickers")),
);
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/stickers", stickerRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/import", importExcelRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/trade-requests", tradeRequestsRoutes);
// Autenticación de sockets con el mismo JWT del login
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No autenticado"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch (_err) {
    next(new Error("Token inválido"));
  }
});

const onlineUsers = new Map();

function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

io.on("connection", (socket) => {
  const userId = Number(socket.userId);

  socket.join(`user:${userId}`);

  const currentConnections =
    onlineUsers.get(userId) || 0;

  onlineUsers.set(userId, currentConnections + 1);

  socket.emit("presence:list", getOnlineUserIds());

  if (currentConnections === 0) {
    socket.broadcast.emit("presence:online", userId);
  }

  socket.on("typing:start", ({ receiverUserId }) => {
    const receiverId = Number(receiverUserId);

    if (!Number.isInteger(receiverId)) {
      return;
    }

    io.to(`user:${receiverId}`).emit("typing:start", {
      userId,
    });
  });

  socket.on("typing:stop", ({ receiverUserId }) => {
    const receiverId = Number(receiverUserId);

    if (!Number.isInteger(receiverId)) {
      return;
    }

    io.to(`user:${receiverId}`).emit("typing:stop", {
      userId,
    });
  });

  socket.on("disconnect", () => {
    const remainingConnections =
      (onlineUsers.get(userId) || 1) - 1;

    if (remainingConnections <= 0) {
      onlineUsers.delete(userId);
      socket.broadcast.emit("presence:offline", userId);
    } else {
      onlineUsers.set(userId, remainingConnections);
    }
  });
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(
    `API de Figuritas del Mundial escuchando en http://localhost:${port}`,
  );
});
