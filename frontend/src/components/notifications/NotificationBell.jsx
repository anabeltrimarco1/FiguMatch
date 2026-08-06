import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside,
      );
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  async function handleOpenNotification(notification) {
    await markAsRead(notification.id);
    setOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  }

  return (
    <div
      ref={containerRef}
      className="notification-center"
    >
      <button
        type="button"
        className="app-header-icon-button app-notification-button"
        aria-label={`Notificaciones${
          unreadCount > 0
            ? `, ${unreadCount} sin leer`
            : ""
        }`}
        aria-expanded={open}
        title="Notificaciones"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">🔔</span>

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          onOpenNotification={handleOpenNotification}
          onMarkAllAsRead={markAllAsRead}
          onDeleteNotification={removeNotification}
        />
      )}
    </div>
  );
}
