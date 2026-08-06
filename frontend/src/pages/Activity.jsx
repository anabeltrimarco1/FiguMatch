import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../context/NotificationContext.jsx";
import "./Activity.css";

const TYPE_CONFIG = {
  NEW_MESSAGE: { icon: "💬", label: "Mensaje" },
  TRADE_REQUEST: { icon: "🤝", label: "Solicitud" },
  TRADE_ACCEPTED: { icon: "✅", label: "Aceptado" },
  TRADE_REJECTED: { icon: "❌", label: "Rechazado" },
  TRADE_CANCELLED: { icon: "🚫", label: "Cancelado" },
  NEW_MATCH: { icon: "⭐", label: "Coincidencia" },
  SYSTEM: { icon: "🔔", label: "Sistema" },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || {
    icon: "🔔",
    label: "Actividad",
  };
}

function getRelativeTime(dateValue) {
  const createdAt = new Date(dateValue);
  const difference = Date.now() - createdAt.getTime();

  if (Number.isNaN(createdAt.getTime()) || difference < 0) {
    return "";
  }

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `Hace ${days} día${days === 1 ? "" : "s"}`;
  }

  return createdAt.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getActionLabel(notification) {
  if (notification.link === "/chat") return "Abrir chat";
  if (notification.link === "/intercambios") return "Ver intercambio";
  if (notification.link === "/matches") return "Ver coincidencias";
  return "Abrir";
}

export default function Activity() {
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    loadNotifications,
  } = useNotifications();

  const orderedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (first, second) =>
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime(),
      ),
    [notifications],
  );

  async function handleOpen(notification) {
    await markAsRead(notification.id);

    if (notification.link) {
      navigate(notification.link);
    }
  }

  return (
    <section className="activity-page">
      <header className="activity-hero">
        <div>
          <span className="activity-eyebrow">TU CUENTA</span>
          <h2>Centro de actividad</h2>
          <p>
            Revisá mensajes, intercambios y novedades importantes de FiguMatch.
          </p>
        </div>

        <div className="activity-hero-actions">
          <button
            type="button"
            className="activity-secondary-button"
            onClick={loadNotifications}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>

          <button
            type="button"
            className="activity-primary-button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Marcar todas como leídas
          </button>
        </div>
      </header>

      <div className="activity-summary">
        <article>
          <span>Total</span>
          <strong>{notifications.length}</strong>
        </article>

        <article>
          <span>Sin leer</span>
          <strong>{unreadCount}</strong>
        </article>

        <article>
          <span>Estado</span>
          <strong>
            {unreadCount > 0 ? "Tenés novedades" : "Todo al día"}
          </strong>
        </article>
      </div>

      {loading && notifications.length === 0 && (
        <div className="activity-state">
          <span aria-hidden="true">⏳</span>
          <strong>Cargando actividad...</strong>
        </div>
      )}

      {!loading && error && (
        <div className="activity-state error">
          <span aria-hidden="true">⚠️</span>
          <strong>{error}</strong>
          <button type="button" onClick={loadNotifications}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && orderedNotifications.length === 0 && (
        <div className="activity-state">
          <span aria-hidden="true">🔔</span>
          <strong>No hay actividad todavía</strong>
          <p>
            Los mensajes y movimientos de intercambios aparecerán acá.
          </p>
        </div>
      )}

      {!error && orderedNotifications.length > 0 && (
        <div className="activity-timeline">
          {orderedNotifications.map((notification) => {
            const config = getTypeConfig(notification.type);

            return (
              <article
                key={notification.id}
                className={`activity-item ${
                  notification.is_read ? "is-read" : "is-unread"
                }`}
              >
                <div className="activity-item-icon" aria-hidden="true">
                  {config.icon}
                </div>

                <div className="activity-item-content">
                  <div className="activity-item-heading">
                    <div>
                      <span className="activity-item-type">
                        {config.label}
                      </span>
                      <h3>{notification.title}</h3>
                    </div>

                    {!notification.is_read && (
                      <span className="activity-unread-badge">
                        Nuevo
                      </span>
                    )}
                  </div>

                  <p>{notification.message}</p>

                  <div className="activity-item-footer">
                    <time dateTime={notification.created_at}>
                      {getRelativeTime(notification.created_at)}
                    </time>

                    <div className="activity-item-actions">
                      {!notification.is_read && (
                        <button
                          type="button"
                          className="activity-link-button"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Marcar como leída
                        </button>
                      )}

                      {notification.link && (
                        <button
                          type="button"
                          className="activity-action-button"
                          onClick={() => handleOpen(notification)}
                        >
                          {getActionLabel(notification)}
                        </button>
                      )}

                      <button
                        type="button"
                        className="activity-delete-button"
                        aria-label="Eliminar actividad"
                        title="Eliminar"
                        onClick={() =>
                          removeNotification(notification.id)
                        }
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
