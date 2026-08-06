import "./NotificationToast.css";

export default function NotificationToast({
  notification,
  onClose,
}) {
  if (!notification) return null;

  return (
    <div className="notification-toast">
      <div className="notification-toast-icon">
        🔔
      </div>

      <div className="notification-toast-content">
        <h4>{notification.title}</h4>

        <p>{notification.message}</p>
      </div>

      <button
        className="notification-toast-close"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}