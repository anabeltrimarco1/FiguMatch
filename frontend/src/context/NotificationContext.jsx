import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/notifications");

      setNotifications(
        Array.isArray(response.data?.notifications)
          ? response.data.notifications
          : [],
      );

      setUnreadCount(
        Number(response.data?.unreadCount) || 0,
      );
    } catch (requestError) {
      console.error(
        "ERROR AL CARGAR NOTIFICACIONES:",
        requestError,
      );

      setError(
        requestError.response?.data?.error ||
        "No se pudieron cargar las notificaciones.",
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAsRead(notificationId) {
    const notification = notifications.find(
      (item) => Number(item.id) === Number(notificationId),
    );

    if (!notification || notification.is_read) {
      return;
    }

    try {
      await api.put(
        `/notifications/${notificationId}/read`,
      );

      setNotifications((current) =>
        current.map((item) =>
          Number(item.id) === Number(notificationId)
            ? {
                ...item,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : item,
        ),
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1),
      );
    } catch (requestError) {
      console.error(
        "ERROR AL MARCAR NOTIFICACIÓN:",
        requestError,
      );
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) {
      return;
    }

    try {
      await api.put("/notifications/read-all");

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at:
            item.read_at || new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch (requestError) {
      console.error(
        "ERROR AL MARCAR TODAS COMO LEÍDAS:",
        requestError,
      );
    }
  }

  async function removeNotification(notificationId) {
    try {
      await api.delete(
        `/notifications/${notificationId}`,
      );

      setNotifications((current) =>
        current.filter(
          (item) =>
            Number(item.id) !== Number(notificationId),
        ),
      );

      const removedNotification = notifications.find(
        (item) =>
          Number(item.id) === Number(notificationId),
      );

      if (removedNotification && !removedNotification.is_read) {
        setUnreadCount((current) =>
          Math.max(0, current - 1),
        );
      }
    } catch (requestError) {
      console.error(
        "ERROR AL ELIMINAR NOTIFICACIÓN:",
        requestError,
      );
    }
  }

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      loadNotifications,
      markAsRead,
      markAllAsRead,
      removeNotification,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      loadNotifications,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications debe utilizarse dentro de NotificationProvider",
    );
  }

  return context;
}
