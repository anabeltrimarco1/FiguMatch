function getRelativeTime(dateValue) {
  const createdAt = new Date(dateValue);
  const difference = Date.now() - createdAt.getTime();

  if (Number.isNaN(difference)) {
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

  return `Hace ${days} día${days === 1 ? "" : "s"}`;
}

const ICONS = {
  NEW_MESSAGE: "💬",
  TRADE_REQUEST: "🤝",
  TRADE_ACCEPTED: "✅",
  TRADE_REJECTED: "❌",
  NEW_MATCH: "⭐",
};

export default function NotificationItem({
  notification,
  onOpen,
  onDelete,
}) {
  return (
    <article
      className={`notification-item ${
        notification.is_read ? "is-read" : "is-unread"
      }`}
    >
      <button
        type="button"
        className="notification-item-main"
        onClick={() => onOpen(notification)}
      >
        <span
          className="notification-item-icon"
          aria-hidden="true"
        >
          {ICONS[notification.type] || "🔔"}
        </span>

        <span className="notification-item-copy">
          <strong>{notification.title}</strong>
          <span>{notification.message}</span>
          <small>
            {getRelativeTime(notification.created_at)}
          </small>
        </span>

        {!notification.is_read && (
          <span
            className="notification-unread-dot"
            aria-label="Sin leer"
          />
        )}
      </button>

      <button
        type="button"
        className="notification-delete-button"
        aria-label="Eliminar notificación"
        title="Eliminar"
        onClick={() => onDelete(notification.id)}
      >
        ×
      </button>
    </article>
  );
}
