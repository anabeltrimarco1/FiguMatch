import NotificationItem from "./NotificationItem";

export default function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  error,
  onOpenNotification,
  onMarkAllAsRead,
  onDeleteNotification,
}) {
  return (
    <div
      className="notification-panel"
      role="dialog"
      aria-label="Centro de notificaciones"
    >
      <div className="notification-panel-header">
        <div>
          <strong>Notificaciones</strong>
          <span>
            {unreadCount > 0
              ? `${unreadCount} sin leer`
              : "Todo al día"}
          </span>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
          >
            Marcar todas
          </button>
        )}
      </div>

      <div className="notification-panel-content">
        {loading && (
          <p className="notification-panel-state">
            Cargando notificaciones...
          </p>
        )}

        {!loading && error && (
          <p className="notification-panel-state error">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          notifications.length === 0 && (
            <div className="notification-empty">
              <span aria-hidden="true">🔔</span>
              <strong>No tenés notificaciones</strong>
              <p>Cuando haya novedades aparecerán acá.</p>
            </div>
          )}

        {!loading &&
          !error &&
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={onOpenNotification}
              onDelete={onDeleteNotification}
            />
          ))}
      </div>
    </div>
  );
}
