import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

import groupRoutes from "./routes/groups.js";
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

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const isLocal =
    origin === "http://localhost:5173";

  const isVercel =
    /^https:\/\/.*\.vercel\.app$/.test(origin);

  return isLocal || isVercel;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.error(
      "CORS rechazó el origen:",
      origin,
    );

    return callback(
      new Error(
        `Origen no permitido por CORS: ${origin}`,
      ),
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.error(
        "Socket.IO rechazó el origen:",
        origin,
      );

      return callback(
        new Error("Origen no permitido"),
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
    ],
  },
});

app.set("io", io);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

app.use(
  "/stickers-images",
  express.static(
    path.join(
      __dirname,
      "../public/stickers",
    ),
  ),
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message:
      "Backend de FiguMatch funcionando",
  });
});

app.use("/api/groups", groupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/stickers", stickerRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/import", importExcelRoutes);
app.use("/api/teams", teamsRoutes);

app.use(
  "/api/trade-requests",
  tradeRequestsRoutes,
);

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token;

  if (!token) {
    return next(
      new Error("No autenticado"),
    );
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    socket.userId = payload.userId;

    return next();
  } catch (error) {
    console.error(
      "Error verificando JWT del socket:",
      error,
    );

    return next(
      new Error("Token inválido"),
    );
  }
});

const onlineUsers = new Map();

function getOnlineUserIds() {
  return Array.from(
    onlineUsers.keys(),
  );
}

io.on("connection", (socket) => {
  const userId =
    Number(socket.userId);

  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    socket.disconnect(true);
    return;
  }

  socket.join(`user:${userId}`);

  const currentConnections =
    onlineUsers.get(userId) || 0;

  onlineUsers.set(
    userId,
    currentConnections + 1,
  );

  socket.emit(
    "presence:list",
    getOnlineUserIds(),
  );

  if (currentConnections === 0) {
    socket.broadcast.emit(
      "presence:online",
      userId,
    );
  }

  socket.on(
    "typing:start",
    ({ receiverUserId }) => {
      const receiverId =
        Number(receiverUserId);

      if (
        !Number.isInteger(receiverId) ||
        receiverId <= 0
      ) {
        return;
      }

      io.to(`user:${receiverId}`).emit(
        "typing:start",
        {
          userId,
        },
      );
    },
  );

  socket.on(
    "typing:stop",
    ({ receiverUserId }) => {
      const receiverId =
        Number(receiverUserId);

      if (
        !Number.isInteger(receiverId) ||
        receiverId <= 0
      ) {
        return;
      }

      io.to(`user:${receiverId}`).emit(
        "typing:stop",
        {
          userId,
        },
      );
    },
  );

  socket.on("disconnect", () => {
    const remainingConnections =
      (onlineUsers.get(userId) || 1) - 1;

    if (remainingConnections <= 0) {
      onlineUsers.delete(userId);

      socket.broadcast.emit(
        "presence:offline",
        userId,
      );

      return;
    }

    onlineUsers.set(
      userId,
      remainingConnections,
    );
  });
});

app.use(
  (error, _req, res, _next) => {
    console.error(
      "Error del servidor:",
      error,
    );

    if (
      error?.message?.includes(
        "Origen no permitido",
      )
    ) {
      return res.status(403).json({
        error:
          "Origen no autorizado",
      });
    }

    return res.status(500).json({
      error:
        "Error interno del servidor",
    });
  },
);

const port =
  process.env.PORT || 4000;

server.listen(port, () => {
  console.log(
    `
🚀 FiguMatch API iniciada
📡 Puerto: ${port}
🌍 Entorno: ${
      process.env.NODE_ENV ||
      "development"
    }
`,
  );
});