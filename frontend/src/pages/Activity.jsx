import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../context/NotificationContext.jsx";
import "./Activity.css";

const TYPE_CONFIG = {
  NEW_MESSAGE: {
    icon: "💬",
    label: "Mensaje",
    category: "messages",
  },
  TRADE_REQUEST: {
    icon: "🤝",
    label: "Solicitud",
    category: "trades",
  },
  TRADE_ACCEPTED: {
    icon: "✅",
    label: "Aceptado",
    category: "trades",
  },
  TRADE_REJECTED: {
    icon: "❌",
    label: "Rechazado",
    category: "trades",
  },
  TRADE_CANCELLED: {
    icon: "🚫",
    label: "Cancelado",
    category: "trades",
  },
  NEW_MATCH: {
    icon: "⭐",
    label: "Coincidencia",
    category: "system",
  },
  SYSTEM: {
    icon: "🔔",
    label: "Sistema",
    category: "system",
  },
};

const FILTERS = [
  {
    id: "all",
    label: "Todas",
    icon: "✨",
  },
  {
    id: "messages",
    label: "Mensajes",
    icon: "💬",
  },
  {
    id: "trades",
    label: "Intercambios",
    icon: "🤝",
  },
  {
    id: "system",
    label: "Sistema",
    icon: "🔔",
  },
];

function getTypeConfig(type) {
  return (
    TYPE_CONFIG[type] || {
      icon: "🔔",
      label: "Actividad",
      category: "system",
    }
  );
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getRelativeTime(dateValue) {
  const createdAt = new Date(dateValue);
  const difference = Date.now() - createdAt.getTime();

  if (
    Number.isNaN(createdAt.getTime()) ||
    difference < 0
  ) {
    return "";
  }

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return "Ahora";
  }

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

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
  if (notification.link === "/chat") {
    return "Abrir chat";
  }

  if (notification.link === "/intercambios") {
    return "Ver intercambio";
  }

  if (notification.link === "/matches") {
    return "Ver coincidencias";
  }

  return "Abrir";
}


function startOfDay(dateValue) {
  const date = new Date(dateValue);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function getDateGroup(dateValue) {
  const createdAt = new Date(dateValue);

  if (Number.isNaN(createdAt.getTime())) {
    return "previous";
  }

  const today = startOfDay(new Date());
  const notificationDay = startOfDay(createdAt);

  const differenceInDays = Math.floor(
    (today.getTime() - notificationDay.getTime()) /
      86400000,
  );

  if (differenceInDays === 0) {
    return "today";
  }

  if (differenceInDays === 1) {
    return "yesterday";
  }

  if (differenceInDays > 1 && differenceInDays < 7) {
    return "week";
  }

  return "previous";
}

const DATE_GROUPS = [
  {
    id: "today",
    label: "Hoy",
    icon: "☀️",
  },
  {
    id: "yesterday",
    label: "Ayer",
    icon: "🌙",
  },
  {
    id: "week",
    label: "Esta semana",
    icon: "📅",
  },
  {
    id: "previous",
    label: "Anteriores",
    icon: "🗂️",
  },
];

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

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const counters = useMemo(() => {
    return notifications.reduce(
      (result, notification) => {
        const config = getTypeConfig(notification.type);

        result.all += 1;
        result[config.category] += 1;

        return result;
      },
      {
        all: 0,
        messages: 0,
        trades: 0,
        system: 0,
      },
    );
  }, [notifications]);

  const premiumStats = useMemo(() => {
    const total = notifications.length;
    const read = Math.max(0, total - unreadCount);

    const messages = notifications.filter(
      (notification) =>
        getTypeConfig(notification.type).category ===
        "messages",
    ).length;

    const trades = notifications.filter(
      (notification) =>
        getTypeConfig(notification.type).category ===
        "trades",
    ).length;

    const system = notifications.filter(
      (notification) =>
        getTypeConfig(notification.type).category ===
        "system",
    ).length;

    const percentage = (value) =>
      total > 0
        ? Math.round((value / total) * 100)
        : 0;

    return {
      total,
      unread: unreadCount,
      read,
      messages,
      trades,
      system,
      unreadPercentage: percentage(unreadCount),
      readPercentage: percentage(read),
      messagesPercentage: percentage(messages),
      tradesPercentage: percentage(trades),
      systemPercentage: percentage(system),
    };
  }, [notifications, unreadCount]);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    return [...notifications]
      .filter((notification) => {
        const config = getTypeConfig(notification.type);

        const matchesCategory =
          activeFilter === "all" ||
          config.category === activeFilter;

        const matchesUnread =
          !onlyUnread || !notification.is_read;

        const searchableText = normalizeText(
          [
            notification.title,
            notification.message,
            config.label,
            notification.type,
          ].join(" "),
        );

        const matchesSearch =
          !normalizedSearch ||
          searchableText.includes(normalizedSearch);

        return (
          matchesCategory &&
          matchesUnread &&
          matchesSearch
        );
      })
      .sort(
        (first, second) =>
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime(),
      );
  }, [
    notifications,
    searchTerm,
    activeFilter,
    onlyUnread,
  ]);

  const groupedNotifications = useMemo(() => {
    const groups = {
      today: [],
      yesterday: [],
      week: [],
      previous: [],
    };

    filteredNotifications.forEach((notification) => {
      const groupId = getDateGroup(
        notification.created_at,
      );

      groups[groupId].push(notification);
    });

    return DATE_GROUPS.map((group) => ({
      ...group,
      notifications: groups[group.id],
    })).filter(
      (group) => group.notifications.length > 0,
    );
  }, [filteredNotifications]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    activeFilter !== "all" ||
    onlyUnread;

  function clearFilters() {
    setSearchTerm("");
    setActiveFilter("all");
    setOnlyUnread(false);
  }

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
          <span className="activity-eyebrow">
            TU CUENTA
          </span>

          <h2>Centro de actividad</h2>

          <p>
            Revisá mensajes, intercambios y novedades
            importantes de FiguMatch.
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

      <section
        className="activity-insights"
        aria-label="Resumen de actividad"
      >
        <article className="activity-insight-card activity-insight-total">
          <div className="activity-insight-heading">
            <span aria-hidden="true">📊</span>

            <div>
              <small>Actividad total</small>
              <strong>{premiumStats.total}</strong>
            </div>
          </div>

          <p>
            Todo lo que ocurrió recientemente en tu cuenta.
          </p>
        </article>

        <article className="activity-insight-card activity-insight-unread">
          <div className="activity-insight-heading">
            <span aria-hidden="true">🔔</span>

            <div>
              <small>Sin leer</small>
              <strong>{premiumStats.unread}</strong>
            </div>
          </div>

          <div className="activity-progress">
            <span>
              <i
                style={{
                  width: `${premiumStats.unreadPercentage}%`,
                }}
              />
            </span>

            <small>
              {premiumStats.unreadPercentage}% pendiente
            </small>
          </div>
        </article>

        <article className="activity-insight-card activity-insight-read">
          <div className="activity-insight-heading">
            <span aria-hidden="true">✅</span>

            <div>
              <small>Leídas</small>
              <strong>{premiumStats.read}</strong>
            </div>
          </div>

          <div className="activity-progress">
            <span>
              <i
                style={{
                  width: `${premiumStats.readPercentage}%`,
                }}
              />
            </span>

            <small>
              {premiumStats.readPercentage}% revisado
            </small>
          </div>
        </article>

        <article className="activity-insight-card activity-insight-messages">
          <div className="activity-insight-heading">
            <span aria-hidden="true">💬</span>

            <div>
              <small>Mensajes</small>
              <strong>{premiumStats.messages}</strong>
            </div>
          </div>

          <div className="activity-progress">
            <span>
              <i
                style={{
                  width: `${premiumStats.messagesPercentage}%`,
                }}
              />
            </span>

            <small>
              {premiumStats.messagesPercentage}% del total
            </small>
          </div>
        </article>

        <article className="activity-insight-card activity-insight-trades">
          <div className="activity-insight-heading">
            <span aria-hidden="true">🤝</span>

            <div>
              <small>Intercambios</small>
              <strong>{premiumStats.trades}</strong>
            </div>
          </div>

          <div className="activity-progress">
            <span>
              <i
                style={{
                  width: `${premiumStats.tradesPercentage}%`,
                }}
              />
            </span>

            <small>
              {premiumStats.tradesPercentage}% del total
            </small>
          </div>
        </article>

        <article className="activity-insight-card activity-insight-system">
          <div className="activity-insight-heading">
            <span aria-hidden="true">⚙️</span>

            <div>
              <small>Sistema</small>
              <strong>{premiumStats.system}</strong>
            </div>
          </div>

          <div className="activity-progress">
            <span>
              <i
                style={{
                  width: `${premiumStats.systemPercentage}%`,
                }}
              />
            </span>

            <small>
              {premiumStats.systemPercentage}% del total
            </small>
          </div>
        </article>
      </section>

      <section
        className="activity-toolbar"
        aria-label="Filtros de actividad"
      >
        <label className="activity-search">
          <span aria-hidden="true">🔍</span>

          <input
            type="search"
            value={searchTerm}
            placeholder="Buscar actividad..."
            aria-label="Buscar actividad"
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />

          {searchTerm && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
              onClick={() => setSearchTerm("")}
            >
              ×
            </button>
          )}
        </label>

        <div
          className="activity-filter-list"
          role="group"
          aria-label="Filtrar por categoría"
        >
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`activity-filter-button ${
                activeFilter === filter.id
                  ? "is-active"
                  : ""
              }`}
              aria-pressed={activeFilter === filter.id}
              onClick={() => setActiveFilter(filter.id)}
            >
              <span aria-hidden="true">
                {filter.icon}
              </span>

              <span>{filter.label}</span>

              <strong>{counters[filter.id]}</strong>
            </button>
          ))}
        </div>

        <label className="activity-unread-toggle">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(event) =>
              setOnlyUnread(event.target.checked)
            }
          />

          <span className="activity-toggle-track">
            <span />
          </span>

          <span>Solo no leídas</span>
        </label>
      </section>

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

          <button
            type="button"
            onClick={loadNotifications}
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        notifications.length === 0 && (
          <div className="activity-state">
            <span aria-hidden="true">🔔</span>
            <strong>No hay actividad todavía</strong>

            <p>
              Los mensajes y movimientos de intercambios
              aparecerán acá.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        notifications.length > 0 &&
        filteredNotifications.length === 0 && (
          <div className="activity-state">
            <span aria-hidden="true">🔎</span>
            <strong>No encontramos resultados</strong>

            <p>
              Probá con otra búsqueda o cambiá los
              filtros seleccionados.
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

      {!error &&
        filteredNotifications.length > 0 && (
          <>
            <div className="activity-results-heading">
              <span>
                {filteredNotifications.length} resultado
                {filteredNotifications.length === 1
                  ? ""
                  : "s"}
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="activity-groups">
              {groupedNotifications.map((group) => (
                <section
                  key={group.id}
                  className="activity-date-group"
                >
                  <header className="activity-date-heading">
                    <div>
                      <span aria-hidden="true">
                        {group.icon}
                      </span>

                      <h3>{group.label}</h3>
                    </div>

                    <strong>
                      {group.notifications.length}
                    </strong>
                  </header>

                  <div className="activity-timeline">
                    {group.notifications.map(
                      (notification) => {
                        const config = getTypeConfig(
                          notification.type,
                        );

                        return (
                          <article
                            key={notification.id}
                            className={`activity-item activity-item-${config.category} activity-type-${String(
                              notification.type || "system",
                            )
                              .toLowerCase()
                              .replace(/_/g, "-")} ${
                              notification.is_read
                                ? "is-read"
                                : "is-unread"
                            }`}
                          >
                            <div
                              className="activity-item-icon"
                              aria-hidden="true"
                            >
                              {config.icon}
                            </div>

                            <div className="activity-item-content">
                              <div className="activity-item-heading">
                                <div>
                                  <span className="activity-item-type">
                                    {config.label}
                                  </span>

                                  <h3>
                                    {notification.title}
                                  </h3>
                                </div>

                                {!notification.is_read && (
                                  <span className="activity-unread-badge">
                                    Nuevo
                                  </span>
                                )}
                              </div>

                              <p>
                                {notification.message}
                              </p>

                              <div className="activity-item-footer">
                                <time
                                  dateTime={
                                    notification.created_at
                                  }
                                >
                                  {getRelativeTime(
                                    notification.created_at,
                                  )}
                                </time>

                                <div className="activity-item-actions">
                                  {!notification.is_read && (
                                    <button
                                      type="button"
                                      className="activity-link-button"
                                      onClick={() =>
                                        markAsRead(
                                          notification.id,
                                        )
                                      }
                                    >
                                      Marcar como leída
                                    </button>
                                  )}

                                  {notification.link && (
                                    <button
                                      type="button"
                                      className="activity-action-button"
                                      onClick={() =>
                                        handleOpen(
                                          notification,
                                        )
                                      }
                                    >
                                      {getActionLabel(
                                        notification,
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="activity-delete-button"
                                    aria-label="Eliminar actividad"
                                    title="Eliminar"
                                    onClick={() =>
                                      removeNotification(
                                        notification.id,
                                      )
                                    }
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
    </section>
  );
}
