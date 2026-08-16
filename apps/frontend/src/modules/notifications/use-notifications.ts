import { useSyncExternalStore } from "react";

import {
  clearNotifications,
  getNotifications,
  markNotificationRead,
  subscribeNotifications,
} from "./notifications";

export function useNotifications() {
  const notifications = useSyncExternalStore(
    subscribeNotifications,
    getNotifications,
    getNotifications,
  );
  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    markRead: markNotificationRead,
    clear: clearNotifications,
  };
}
