import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.DEV
  ? "http://localhost:4000"
  : "https://figumatch-production.up.railway.app";

let socket = null;
let currentToken = null;

function emitStatus(status, detail = {}) {
  window.dispatchEvent(
    new CustomEvent("figuritas:socket-status", {
      detail: {
        status,
        ...detail,
      },
    }),
  );
}

function createSocket(token) {
  const newSocket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 15000,
    autoConnect: true,
  });

  newSocket.on("connect", () => {
    emitStatus("connected", {
      socketId: newSocket.id,
    });
  });

  newSocket.on("disconnect", (reason) => {
    emitStatus("disconnected", {
      reason,
    });
  });

  newSocket.on("connect_error", (error) => {
    emitStatus("error", {
      message: error.message,
    });

    console.error(
      "Error de conexión Socket.IO:",
      error.message,
    );
  });

  newSocket.io.on("reconnect_attempt", (attempt) => {
    emitStatus("reconnecting", {
      attempt,
    });
  });

  newSocket.io.on("reconnect", (attempt) => {
    emitStatus("connected", {
      attempt,
      socketId: newSocket.id,
    });
  });

  return newSocket;
}

export function connectSocket(token) {
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket && currentToken === token) {
    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  disconnectSocket();

  currentToken = token;
  emitStatus("connecting");

  socket = createSocket(token);

  return socket;
}

export function reconnectSocket(token) {
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (!socket) {
    return connectSocket(token);
  }

  if (currentToken === token && socket.connected) {
    return socket;
  }

  disconnectSocket();
  return connectSocket(token);
}

export function updateSocketToken(token) {
  return reconnectSocket(token);
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = null;
  emitStatus("disconnected");
}

export function getSocket() {
  return socket;
}

export function isSocketConnected() {
  return Boolean(socket?.connected);
}
