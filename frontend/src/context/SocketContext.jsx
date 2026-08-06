import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../socket";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();

  const [status, setStatus] = useState("disconnected");
  const [socket, setSocket] = useState(getSocket());

  useEffect(() => {
    function handleSocketStatus(event) {
      setStatus(event.detail?.status || "disconnected");
      setSocket(getSocket());
    }

    window.addEventListener(
      "figuritas:socket-status",
      handleSocketStatus,
    );

    return () => {
      window.removeEventListener(
        "figuritas:socket-status",
        handleSocketStatus,
      );
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      setSocket(null);
      setStatus("disconnected");
      return;
    }

    const activeSocket = connectSocket(token);
    setSocket(activeSocket);

    return () => {
      /*
       * No desconectamos en cada render.
       * El logout y el desmontaje global se encargan de cerrar la conexión.
       */
    };
  }, [isAuthenticated, token]);

  const value = useMemo(
    () => ({
      socket,
      status,
      isConnected: status === "connected",
      isConnecting:
        status === "connecting" ||
        status === "reconnecting",
    }),
    [socket, status],
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error(
      "useSocket debe utilizarse dentro de SocketProvider",
    );
  }

  return context;
}
