import { toast } from "sonner";
import { getDesktopBridge } from "@/infrastructure/desktop-bridge";

export type NotificationLevel = "error" | "info" | "success" | "warning";

export type NotificationRecord = {
  createdAt: string;
  details?: string;
  id: string;
  level: NotificationLevel;
  message: string;
  read: boolean;
  title: string;
};

type Listener = () => void;

let records: NotificationRecord[] = [];
const listeners = new Set<Listener>();

export function publishNotification(input: {
  details?: string;
  level: NotificationLevel;
  message: string;
  title: string;
}) {
  const record: NotificationRecord = {
    ...input,
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    read: false,
  };
  records = [record, ...records].slice(0, 100);
  listeners.forEach((listener) => listener());
  const unfocused = typeof document !== "undefined" && !document.hasFocus();
  if (unfocused && typeof window !== "undefined" && window.streamlet?.showNativeNotification) {
    void getDesktopBridge()
      .showNativeNotification(input.title, input.message)
      .catch(() => undefined);
  } else {
    const showToast =
      input.level === "error"
        ? toast.error
        : input.level === "warning"
          ? toast.warning
          : toast.info;
    showToast(input.title, { description: input.message });
  }
  return record;
}

export function getNotifications() {
  return records;
}

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markNotificationRead(id: string) {
  records = records.map((record) => (record.id === id ? { ...record, read: true } : record));
  listeners.forEach((listener) => listener());
}

export function clearNotifications() {
  records = [];
  listeners.forEach((listener) => listener());
}
