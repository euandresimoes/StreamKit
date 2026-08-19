import { Bell, CheckCheck, ChevronLeft, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useNotifications } from "@/modules/notifications/use-notifications";
import type { NotificationRecord } from "@/modules/notifications/notifications";
import i18n from "@/i18n";

function formatNotificationDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

function levelClass(level: NotificationRecord["level"]) {
  return level === "error"
    ? "border-red-400/30"
    : level === "warning"
      ? "border-yellow-400/30"
      : "border-border";
}

export function NotificationsCenter() {
  const { t, i18n: activeI18n } = useTranslation(undefined, { i18n });
  const { clear, notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationRecord | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const openNotification = (notification: NotificationRecord) => {
    markRead(notification.id);
    setSelected(notification);
  };

  return (
    <div ref={containerRef} className="relative h-full">
      <Button
        id="notification-menu-trigger"
        variant="ghost"
        size="icon-sm"
        className="relative h-full w-10 rounded-none"
        aria-label={t("notifications.title")}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setSelected(null);
        }}
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-3 text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <div className="glass-panel absolute right-0 top-full z-50 w-[min(360px,calc(100vw-1rem))] origin-top-right animate-in slide-in-from-top-2 zoom-in-95 rounded-3xl border-border-strong bg-popover/95 p-2 text-popover-foreground">
          {selected ? (
            <div className="animate-in slide-in-from-right-2 duration-200">
              <div className="flex items-center gap-2 border-b border-border px-1 pb-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("notifications.back")}
                  onClick={() => setSelected(null)}
                >
                  <ChevronLeft />
                </Button>
                <p className="min-w-0 flex-1 truncate text-xs font-semibold">{selected.title}</p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("notifications.close")}
                  onClick={() => setOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <div className="max-h-72 overflow-y-auto px-2 py-3">
                <p className="text-xs leading-5 text-foreground">{selected.message}</p>
                {selected.details && (
                  <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-background/60 p-2 text-[10px] leading-4 text-muted-foreground">
                    {selected.details}
                  </pre>
                )}
                <p className="mt-3 text-[10px] text-muted-foreground">
                  {formatNotificationDate(selected.createdAt, activeI18n.language)}
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-left-2 duration-200">
              <div className="flex items-center gap-2 border-b border-border px-2 pb-2">
                <Bell className="size-3.5 text-muted-foreground" />
                <p className="flex-1 text-xs font-semibold">{t("notifications.title")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!notifications.length}
                  onClick={() => {
                    clear();
                    setSelected(null);
                  }}
                >
                  <CheckCheck />
                  {t("notifications.markAllRead")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("notifications.close")}
                  onClick={() => setOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <div className="max-h-80 space-y-1 overflow-y-auto py-2">
                {!notifications.length && (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    {t("notifications.empty")}
                  </p>
                )}
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`flex w-full items-start gap-2 border bg-card/60 p-2 text-left transition-colors hover:bg-white/[0.06] ${levelClass(notification.level)} ${!notification.read ? "bg-white/[0.04]" : "opacity-75"}`}
                    onClick={() => openNotification(notification)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {notification.title}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                        {formatNotificationDate(notification.createdAt, activeI18n.language)}
                      </span>
                    </span>
                    {!notification.read && (
                      <span className="mt-1 size-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
