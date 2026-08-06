import { useSocket } from "../context/SocketContext";

const LABELS = {
  connected: "Online",
  connecting: "Conectando...",
  reconnecting: "Reconectando...",
  disconnected: "Offline",
  error: "Error de conexión",
};

export default function SocketStatusBadge() {
  const { status } = useSocket();

  return (
    <span
      className={`socket-status-badge socket-status-${status}`}
      title="Estado de conexión en tiempo real"
    >
      <span
        className="socket-status-dot"
        aria-hidden="true"
      />
      {LABELS[status] || "Offline"}
    </span>
  );
}
