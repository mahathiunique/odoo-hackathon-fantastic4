import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationService } from '../services/notificationService';

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getAll({ page: 1, limit: 20 });
      setItems(res?.data?.notifications || []);
      setUnread(res?.data?.unreadCount || 0);
    } catch {
      // Keep previous state on transient failure.
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await notificationService.refresh();
    } catch {
      // Ignore refresh failures; a lightweight load still runs below.
    }
    await load();
  }, [load]);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: n.readAt || new Date() } : n)));
    setUnread((u) => (u > 0 ? u - 1 : 0));
    try {
      await notificationService.markRead(id);
    } catch {
      await load();
    }
  }, [load]);

  const markAll = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || new Date() })));
    setUnread(0);
    try {
      await notificationService.markAllRead();
    } catch {
      await load();
    }
  }, [load]);

  // Initial load + periodic refresh so the bell stays current.
  useEffect(() => {
    load();
    const interval = setInterval(() => {
      notificationService
        .getUnreadCount()
        .then((count) => setUnread(count))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <NotificationContext.Provider value={{ items, unread, loading, load, refresh, markRead, markAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
