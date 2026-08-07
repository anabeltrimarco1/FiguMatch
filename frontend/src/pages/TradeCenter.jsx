import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptTradeRequest,
  cancelTradeRequest,
  getReceivedTradeRequests,
  getSentTradeRequests,
  rejectTradeRequest,
  completeTradeRequest,
} from "../services/tradeService.js";
import "./TradeCenter.css";

const TABS = [
  { id: "received", label: "Recibidas", icon: "📥" },
  { id: "sent", label: "Enviadas", icon: "📤" },
  { id: "history", label: "Historial", icon: "📜" },
];

const STATUS_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendientes" },
  { id: "accepted", label: "Aceptados" },
  { id: "rejected", label: "Rechazados" },
  { id: "cancelled", label: "Cancelados" },
  { id: "completed", label: "Completados" },
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

function getDayLabel(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Hoy";
  if (isSameDay(date, yesterday)) return "Ayer";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getStatusConfig(status) {
  const value = String(status || "pending").toLowerCase();

  return (
    {
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
      completed: {
        label: "Completado",
        icon: "🏆",
        className: "completed",
      },
    }[value] || {
      label: "Pendiente",
      icon: "⏳",
      className: "pending",
    }
  );
}

function normalizeRequest(request, direction) {
  const otherUserId =
    direction === "received"
      ? Number(request.requester_id)
      : Number(request.receiver_id);

  const otherUsername =
    direction === "received"
      ? request.requester_username
      : request.receiver_username;

  return {
    ...request,
    direction,
    otherUserId,
    otherUsername: otherUsername?.trim() || "Coleccionista",
    receiveStickerId:
      direction === "received"
        ? request.offered_sticker_id
        : request.requested_sticker_id,
    giveStickerId:
      direction === "received"
        ? request.requested_sticker_id
        : request.offered_sticker_id,
  };
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
  busyAction,
  onAction,
  onOpenChat,
  historyMode = false,
}) {
  const status = getStatusConfig(request.status);
  const pending = status.className === "pending";
  const accepted = status.className === "accepted";
  const busy = busyAction?.requestId === Number(request.id);

  return (
    <article className={`trade-center-card ${status.className}`}>
      <header className="trade-center-card-header">
        <div className="trade-center-user">
          <div className="trade-center-avatar" aria-hidden="true">
            {request.otherUsername.charAt(0).toUpperCase()}
          </div>

          <div>
            <span className="trade-center-card-eyebrow">
              {request.direction === "received"
                ? "PROPUESTA RECIBIDA"
                : "PROPUESTA ENVIADA"}
            </span>

            <h2>{request.otherUsername}</h2>
            <p>{formatDate(request.updated_at || request.created_at)}</p>
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
          stickerId={request.receiveStickerId}
          type="receive"
        />

        <div className="trade-center-swap" aria-hidden="true">
          ⇄
        </div>

        <TradeSticker
          title="Vos entregás"
          stickerId={request.giveStickerId}
          type="give"
        />
      </div>

      {historyMode && (
        <div className="trade-center-timeline">
          <div className="trade-timeline-step done">
            <span>1</span>
            <div>
              <strong>Solicitud creada</strong>
              <small>{formatDate(request.created_at)}</small>
            </div>
          </div>

          <div
            className={`trade-timeline-line ${status.className !== "pending" ? "done" : ""
              }`}
          />

          <div
            className={`trade-timeline-step ${status.className !== "pending" ? "done" : ""
              }`}
          >
            <span>2</span>
            <div>
              <strong>
                {status.className === "pending"
                  ? "Esperando respuesta"
                  : status.label}
              </strong>
              <small>
                {status.className === "pending"
                  ? "Todavía no fue respondida"
                  : formatDate(request.updated_at)}
              </small>
            </div>
          </div>
        </div>
      )}

      <footer className="trade-center-card-footer">
        <span className="trade-center-request-number">
          Solicitud #{request.id}
        </span>

        <div className="trade-center-actions">
          <button
            type="button"
            className="trade-center-chat-button"
            onClick={() =>
              onOpenChat(request.otherUserId, request.otherUsername)
            }
            disabled={busy}
          >
            💬 Abrir chat
          </button>

          {!historyMode &&
            pending &&
            request.direction === "received" && (
              <>
                <button
                  type="button"
                  className="trade-center-action-button accept"
                  disabled={busy}
                  onClick={() => onAction(request, "accept")}
                >
                  {busy && busyAction.action === "accept"
                    ? "Aceptando..."
                    : "✅ Aceptar"}
                </button>

                <button
                  type="button"
                  className="trade-center-action-button reject"
                  disabled={busy}
                  onClick={() => onAction(request, "reject")}
                >
                  {busy && busyAction.action === "reject"
                    ? "Rechazando..."
                    : "❌ Rechazar"}
                </button>
              </>
            )}

          {!historyMode &&
            pending &&
            request.direction === "sent" && (
              <button
                type="button"
                className="trade-center-action-button cancel"
                disabled={busy}
                onClick={() => onAction(request, "cancel")}
              >
                {busy && busyAction.action === "cancel"
                  ? "Cancelando..."
                  : "🚫 Cancelar"}
              </button>
            )}
        </div>
        {!historyMode &&
          accepted && (
            <button
              type="button"
              className="trade-center-action-button complete"
              disabled={busy}
              onClick={() => onAction(request, "complete")}
            >
              {busy && busyAction.action === "complete"
                ? "Completando..."
                : "✅ Completar intercambio"}
            </button>
          )}
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
  const [busyAction, setBusyAction] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
          ? receivedData.tradeRequests.map((request) =>
            normalizeRequest(request, "received"),
          )
          : [],
      );

      setSent(
        Array.isArray(sentData?.tradeRequests)
          ? sentData.tradeRequests.map((request) =>
            normalizeRequest(request, "sent"),
          )
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

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const allRequests = useMemo(
    () =>
      [...received, ...sent].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      ),
    [received, sent],
  );

  const summary = useMemo(() => {
    const accepted = allRequests.filter(
      (request) => request.status === "accepted",
    ).length;

    const resolved = allRequests.filter(
      (request) => request.status !== "pending",
    ).length;

    return {
      total: allRequests.length,
      received: received.length,
      sent: sent.length,
      pending: allRequests.filter(
        (request) => request.status === "pending",
      ).length,
      accepted,
      rejected: allRequests.filter(
        (request) => request.status === "rejected",
      ).length,
      cancelled: allRequests.filter(
        (request) => request.status === "cancelled",
      ).length,
      successRate:
        resolved > 0 ? Math.round((accepted / resolved) * 100) : 0,
    };
  }, [allRequests, received.length, sent.length]);

  const baseRequests = useMemo(() => {
    if (activeTab === "received") return received;
    if (activeTab === "sent") return sent;
    return allRequests;
  }, [activeTab, received, sent, allRequests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return baseRequests.filter((request) => {
      const matchesSearch =
        normalizedSearch === "" ||
        request.otherUsername.toLowerCase().includes(normalizedSearch) ||
        String(request.id).includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        String(request.status).toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [baseRequests, search, statusFilter]);

  const groupedHistory = useMemo(() => {
    if (activeTab !== "history") return [];

    const groups = new Map();

    filteredRequests.forEach((request) => {
      const label = getDayLabel(
        request.updated_at || request.created_at,
      );

      if (!groups.has(label)) {
        groups.set(label, []);
      }

      groups.get(label).push(request);
    });

    return Array.from(groups.entries());
  }, [activeTab, filteredRequests]);

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

  const updateRequestStatus = (requestId, status) => {
    const updateList = (items) =>
      items.map((request) =>
        Number(request.id) === Number(requestId)
          ? {
            ...request,
            status,
            updated_at: new Date().toISOString(),
          }
          : request,
      );

    setReceived(updateList);
    setSent(updateList);
  };

  const handleTradeAction = async (request, action) => {
    const actions = {
      accept: {
        confirm: "¿Querés aceptar esta propuesta de intercambio?",
        success: "Intercambio aceptado correctamente.",
        status: "accepted",
        execute: acceptTradeRequest,
      },
      reject: {
        confirm: "¿Querés rechazar esta propuesta?",
        success: "Solicitud rechazada.",
        status: "rejected",
        execute: rejectTradeRequest,
      },
      cancel: {
        confirm: "¿Querés cancelar la solicitud enviada?",
        success: "Solicitud cancelada.",
        status: "cancelled",
        execute: cancelTradeRequest,
      },
    };

    const selected = actions[action];

    if (!selected || !window.confirm(selected.confirm)) {
      return;
    }

    try {
      setBusyAction({
        requestId: Number(request.id),
        action,
      });

      await selected.execute(request.id);
      updateRequestStatus(request.id, selected.status);

      setToast({
        type: "success",
        message: selected.success,
      });
    } catch (requestError) {
      console.error("TRADE ACTION ERROR:", requestError);

      setToast({
        type: "error",
        message:
          requestError?.response?.data?.error ||
          requestError?.response?.data?.message ||
          requestError?.message ||
          "No se pudo actualizar la solicitud.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <main className="trade-center-page">
      <section className="trade-center-container">
        <header className="trade-center-hero">
          <div>
            <span className="trade-center-eyebrow">
              SPRINT 6.2.3
            </span>

            <h1>Historial de Intercambios</h1>

            <p>
              Gestioná propuestas, consultá resultados y revisá toda
              tu actividad desde un solo lugar.
            </p>
          </div>

          <div className="trade-center-summary">
            <article>
              <strong>{summary.total}</strong>
              <span>Totales</span>
            </article>

            <article>
              <strong>{summary.accepted}</strong>
              <span>Aceptados</span>
            </article>

            <article>
              <strong>{summary.pending}</strong>
              <span>Pendientes</span>
            </article>

            <article>
              <strong>{summary.successRate}%</strong>
              <span>Tasa de éxito</span>
            </article>
          </div>
        </header>

        <nav className="trade-center-tabs" aria-label="Solicitudes">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}

              <strong>
                {tab.id === "received"
                  ? received.length
                  : tab.id === "sent"
                    ? sent.length
                    : allRequests.length}
              </strong>
            </button>
          ))}
        </nav>

        <section className="trade-center-toolbar">
          <label className="trade-center-search">
            <span aria-hidden="true">🔍</span>

            <input
              type="search"
              value={search}
              placeholder="Buscar usuario o número de solicitud..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="trade-status-filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={
                  statusFilter === filter.id ? "active" : ""
                }
                onClick={() => setStatusFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="trade-reset-filters"
            onClick={resetFilters}
          >
            Limpiar
          </button>
        </section>

        {activeTab === "history" && (
          <section className="trade-history-stats">
            <article>
              <span>✅</span>
              <div>
                <strong>{summary.accepted}</strong>
                <small>Aceptados</small>
              </div>
            </article>

            <article>
              <span>❌</span>
              <div>
                <strong>{summary.rejected}</strong>
                <small>Rechazados</small>
              </div>
            </article>

            <article>
              <span>🚫</span>
              <div>
                <strong>{summary.cancelled}</strong>
                <small>Cancelados</small>
              </div>
            </article>

            <article>
              <span>📈</span>
              <div>
                <strong>{summary.successRate}%</strong>
                <small>Efectividad</small>
              </div>
            </article>
          </section>
        )}

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
            <h2>Cargando intercambios</h2>
            <p>Estamos preparando tu actividad.</p>
          </section>
        ) : filteredRequests.length === 0 ? (
          <section className="trade-center-state">
            <span className="trade-center-state-icon">📭</span>
            <h2>No encontramos intercambios</h2>
            <p>
              Probá cambiando los filtros o buscá nuevos
              coleccionistas compatibles.
            </p>

            <div className="trade-empty-actions">
              <button type="button" onClick={resetFilters}>
                Limpiar filtros
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => navigate("/matches")}
              >
                Encontrar matches
              </button>
            </div>
          </section>
        ) : activeTab === "history" ? (
          <section className="trade-history-groups">
            {groupedHistory.map(([label, requests]) => (
              <section className="trade-history-group" key={label}>
                <header>
                  <span />
                  <h2>{label}</h2>
                  <strong>{requests.length}</strong>
                </header>

                <div className="trade-center-list">
                  {requests.map((request) => (
                    <TradeRequestCard
                      key={`${request.direction}-${request.id}`}
                      request={request}
                      busyAction={busyAction}
                      onAction={handleTradeAction}
                      onOpenChat={handleOpenChat}
                      historyMode
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        ) : (
          <section className="trade-center-list">
            {filteredRequests.map((request) => (
              <TradeRequestCard
                key={`${request.direction}-${request.id}`}
                request={request}
                busyAction={busyAction}
                onAction={handleTradeAction}
                onOpenChat={handleOpenChat}
              />
            ))}
          </section>
        )}
      </section>

      {toast && (
        <div
          className={`trade-center-toast ${toast.type}`}
          role="status"
        >
          <span aria-hidden="true">
            {toast.type === "success" ? "✅" : "⚠️"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </main>
  );
}
