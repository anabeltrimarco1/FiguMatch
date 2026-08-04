import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getReceivedTradeRequests,
  getSentTradeRequests,
} from "../services/tradeService.js";
import "./TradeCenter.css";

const TABS = [
  { id: "received", label: "Recibidas", icon: "📥" },
  { id: "sent", label: "Enviadas", icon: "📤" },
];

function formatDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusConfig(status) {
  const normalized = String(status || "pending").toLowerCase();

  const configs = {
    pending: {
      label: "Pendiente",
      icon: "⏳",
      className: "pending",
    },
    accepted: {
      label: "Aceptada",
      icon: "✅",
      className: "accepted",
    },
    rejected: {
      label: "Rechazada",
      icon: "❌",
      className: "rejected",
    },
    cancelled: {
      label: "Cancelada",
      icon: "🚫",
      className: "cancelled",
    },
  };

  return configs[normalized] || configs.pending;
}

function TradeSticker({ title, stickerId, type }) {
  return (
    <article className={`trade-center-sticker ${type}`}>
      <span className="trade-center-sticker-icon" aria-hidden="true">
        {type === "receive" ? "🎁" : "📦"}
      </span>

      <div>
        <small>{title}</small>
        <strong>Figurita #{stickerId || "—"}</strong>
      </div>
    </article>
  );
}

function TradeRequestCard({
  request,
  activeTab,
  onOpenChat,
}) {
  const status = getStatusConfig(request.status);

  const otherUserId =
    activeTab === "received"
      ? Number(request.requester_id)
      : Number(request.receiver_id);

  const otherUsername =
    activeTab === "received"
      ? request.requester_username
      : request.receiver_username;

  const receiveStickerId =
    activeTab === "received"
      ? request.offered_sticker_id
      : request.requested_sticker_id;

  const giveStickerId =
    activeTab === "received"
      ? request.requested_sticker_id
      : request.offered_sticker_id;

  return (
    <article className="trade-center-card">
      <header className="trade-center-card-header">
        <div className="trade-center-user">
          <div className="trade-center-avatar" aria-hidden="true">
            {(otherUsername || "C").trim().charAt(0).toUpperCase()}
          </div>

          <div>
            <span className="trade-center-card-eyebrow">
              {activeTab === "received"
                ? "PROPUESTA RECIBIDA"
                : "PROPUESTA ENVIADA"}
            </span>

            <h2>{otherUsername?.trim() || "Coleccionista"}</h2>

            <p>{formatDate(request.created_at)}</p>
          </div>
        </div>

        <span className={`trade-status-badge ${status.className}`}>
          <span aria-hidden="true">{status.icon}</span>
          {status.label}
        </span>
      </header>

      <div className="trade-center-exchange">
        <TradeSticker
          title="Vos recibís"
          stickerId={receiveStickerId}
          type="receive"
        />

        <div className="trade-center-swap" aria-hidden="true">
          ⇄
        </div>

        <TradeSticker
          title="Vos entregás"
          stickerId={giveStickerId}
          type="give"
        />
      </div>

      <footer className="trade-center-card-footer">
        <div className="trade-center-request-number">
          Solicitud #{request.id}
        </div>

        <div className="trade-center-actions">
          <button
            type="button"
            className="trade-center-chat-button"
            onClick={() =>
              onOpenChat(otherUserId, otherUsername)
            }
          >
            💬 Abrir chat
          </button>

          {status.className === "pending" &&
            activeTab === "received" && (
              <span className="trade-center-next-step">
                Aceptar/Rechazar se agrega en Sprint 6.2.2
              </span>
            )}
        </div>
      </footer>
    </article>
  );
}

export default function TradeCenter() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("received");
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTradeRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [receivedData, sentData] = await Promise.all([
        getReceivedTradeRequests(),
        getSentTradeRequests(),
      ]);

      setReceived(
        Array.isArray(receivedData?.tradeRequests)
          ? receivedData.tradeRequests
          : [],
      );

      setSent(
        Array.isArray(sentData?.tradeRequests)
          ? sentData.tradeRequests
          : [],
      );
    } catch (requestError) {
      console.error("TRADE CENTER ERROR:", requestError);

      setError(
        requestError?.response?.data?.error ||
          requestError?.response?.data?.message ||
          requestError?.message ||
          "No se pudieron cargar las solicitudes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTradeRequests();
  }, [loadTradeRequests]);

  const currentRequests =
    activeTab === "received" ? received : sent;

  const summary = useMemo(() => {
    const all = [...received, ...sent];

    return {
      received: received.length,
      sent: sent.length,
      pending: all.filter(
        (request) =>
          String(request.status).toLowerCase() === "pending",
      ).length,
      completed: all.filter(
        (request) =>
          String(request.status).toLowerCase() === "accepted",
      ).length,
    };
  }, [received, sent]);

  const handleOpenChat = (userId, username) => {
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
      return;
    }

    navigate(
      `/chat?userId=${Number(userId)}&username=${encodeURIComponent(
        username || "Coleccionista",
      )}`,
    );
  };

  return (
    <main className="trade-center-page">
      <section className="trade-center-container">
        <header className="trade-center-hero">
          <div>
            <span className="trade-center-eyebrow">
              SPRINT 6.2.1
            </span>

            <h1>Centro de Intercambios</h1>

            <p>
              Revisá tus propuestas recibidas y enviadas desde un
              único lugar.
            </p>
          </div>

          <div className="trade-center-summary">
            <article>
              <strong>{summary.received}</strong>
              <span>Recibidas</span>
            </article>

            <article>
              <strong>{summary.sent}</strong>
              <span>Enviadas</span>
            </article>

            <article>
              <strong>{summary.pending}</strong>
              <span>Pendientes</span>
            </article>

            <article>
              <strong>{summary.completed}</strong>
              <span>Aceptadas</span>
            </article>
          </div>
        </header>

        <nav className="trade-center-tabs" aria-label="Solicitudes">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={
                activeTab === tab.id ? "active" : ""
              }
              onClick={() => setActiveTab(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}

              <strong>
                {tab.id === "received"
                  ? received.length
                  : sent.length}
              </strong>
            </button>
          ))}
        </nav>

        {error && (
          <div className="trade-center-error" role="alert">
            <span>{error}</span>

            <button type="button" onClick={loadTradeRequests}>
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <section className="trade-center-state">
            <div className="trade-center-spinner" />
            <h2>Cargando solicitudes</h2>
            <p>Estamos preparando tu centro de intercambios.</p>
          </section>
        ) : currentRequests.length === 0 ? (
          <section className="trade-center-state">
            <span className="trade-center-state-icon">🤝</span>

            <h2>
              {activeTab === "received"
                ? "Todavía no recibiste propuestas"
                : "Todavía no enviaste propuestas"}
            </h2>

            <p>
              Buscá coleccionistas compatibles y comenzá tu
              próximo intercambio.
            </p>

            <button
              type="button"
              onClick={() => navigate("/matches")}
            >
              Encontrar matches
            </button>
          </section>
        ) : (
          <section className="trade-center-list">
            {currentRequests.map((request) => (
              <TradeRequestCard
                key={request.id}
                request={request}
                activeTab={activeTab}
                onOpenChat={handleOpenChat}
              />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
