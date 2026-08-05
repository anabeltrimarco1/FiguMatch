import { io } from "socket.io-client";

const URL = import.meta.env.DEV
  ? "http://localhost:4000"
  : "https://figumatch-production.up.railway.app";

let socket = null;

export function connectSocket(token) {
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io(URL, {
    auth: {
      token,
    },
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}