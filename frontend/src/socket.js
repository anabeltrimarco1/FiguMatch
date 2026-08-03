import { io } from "socket.io-client";

const URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000";

let socket = null;

export function connectSocket(token) {
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io(URL, {
    auth: {
      token,
    },
    transports: ["websocket"],
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