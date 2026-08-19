import type { FocusedChatThread } from "@streamlet/contracts";
import { Check, Copy, MessageCircle, Send, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { copyText } from "@/infrastructure/clipboard";
import { integrationApi } from "@/modules/integration/integration-api";
import { MAX_VISIBLE_CHAT_MESSAGES } from "@/modules/performance/bounded-render-window";

function getInitials(value: string) {
  return Array.from(value.trim()).slice(0, 2).join("").toUpperCase();
}

function ChatAvatar({
  name,
  avatarUrl,
  className = "size-9",
}: {
  name: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return avatarUrl ? (
    <img className={`${className} shrink-0 rounded-full object-cover`} src={avatarUrl} alt={name} />
  ) : (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold`}
      title={name}
    >
      {getInitials(name)}
    </span>
  );
}

export function FocusedChatPanel({
  onClose,
  target,
  targetId,
  visible = true,
}: {
  onClose?: () => void;
  target: "giveaways" | "tournaments";
  targetId: string;
  visible?: boolean;
}) {
  const { t } = useTranslation();
  const [thread, setThread] = useState<FocusedChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [rendered, setRendered] = useState(visible && open);

  useEffect(() => {
    if (visible && open) {
      setRendered(true);
      return;
    }
    const timer = window.setTimeout(() => setRendered(false), 180);
    return () => window.clearTimeout(timer);
  }, [open, visible]);

  useEffect(() => {
    setOpen(true);
    let active = true;
    let timer: number | undefined;
    let delay = 1_500;
    const load = async () => {
      try {
        const value = await integrationApi.focusedChat(target, targetId);
        if (active) {
          setThread(value);
          setError(null);
          setLoading(false);
          delay = 1_500;
        }
      } catch (cause) {
        delay = Math.min(delay * 2, 15_000);
        if (active) setError(cause instanceof Error ? cause.message : t("errors.loadChat"));
        if (active) setLoading(false);
      }
    };
    void load();
    const schedule = () => {
      if (active)
        timer = window.setTimeout(async () => {
          await load();
          schedule();
        }, delay);
    };
    schedule();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [target, targetId]);

  const writer = useMemo(
    () =>
      thread?.connections.find(
        (connection) =>
          connection.status === "connected" && connection.capabilities.includes("chat.write"),
      ) ?? null,
    [thread],
  );
  const identities = thread?.identities ?? [];
  const visibleMessages = thread?.messages.slice(-MAX_VISIBLE_CHAT_MESSAGES) ?? [];
  const identity = identities[0] ?? null;
  const isGroup = identities.length > 1;

  const copyHandle = async (handle: string) => {
    setError(null);
    try {
      await copyText(handle);
      setCopied(handle);
      setTimeout(() => setCopied(null), 1_500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("errors.clipboardUnavailable"));
    }
  };
  const send = async () => {
    if (!writer || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await integrationApi.sendMessage(writer.id, message.trim());
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("errors.sendMessage"));
    } finally {
      setSending(false);
    }
  };

  const panelVisible = visible && open;

  if (!rendered && !visible) return null;

  if (!rendered && visible && !open) {
    return (
      <Button
        className="fixed bottom-5 right-5 z-40 rounded-none shadow-2xl"
        size="icon"
        aria-label={t("chat.reopenWinnerChat", { defaultValue: "Reopen winner chat" })}
        title={t("chat.reopenWinnerChat", { defaultValue: "Reopen winner chat" })}
        onClick={() => setOpen(true)}
      >
        <MessageCircle />
      </Button>
    );
  }

  return (
    <aside
      aria-label={t("chat.focusedChat", { defaultValue: "Focused chat" })}
      className={`glass-panel fixed bottom-5 right-5 z-40 flex max-h-[70vh] w-[360px] flex-col overflow-hidden rounded-3xl border border-border-strong bg-popover/95 shadow-2xl ${panelVisible ? "streamlet-focused-chat-in" : "streamlet-focused-chat-out"}`}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        {isGroup ? (
          <div
            className="flex max-w-[92px] shrink-0 items-center -space-x-2"
            aria-label={t("chat.teamMembers")}
          >
            {identities.slice(0, 2).map((member) => (
              <ChatAvatar
                key={`${member.provider}:${member.channelId}:${member.providerUserId}`}
                name={member.displayName}
                avatarUrl={member.avatarUrl}
                className="size-8 border-2 border-popover"
              />
            ))}
            {identities.length > 2 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-popover bg-surface-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                    aria-label={t("chat.showTeamMembers", { count: identities.length - 2 })}
                  >
                    +{identities.length - 2}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 border-border-strong bg-popover p-2">
                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {identities.map((member) => (
                      <button
                        key={`${member.provider}:${member.channelId}:${member.providerUserId}`}
                        type="button"
                        className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-2"
                        onClick={() => void copyHandle(member.handle)}
                        title={t("chat.copyHandle", { handle: member.handle })}
                      >
                        <ChatAvatar
                          name={member.displayName}
                          avatarUrl={member.avatarUrl}
                          className="size-6"
                        />
                        <span className="min-w-0 flex-1 truncate text-xs">{member.handle}</span>
                        <BaseBrandIcon provider={member.provider} className="size-3.5 shrink-0" />
                        {copied === member.handle ? (
                          <Check className="size-3.5 shrink-0 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        ) : identity ? (
          <ChatAvatar name={identity.displayName} avatarUrl={identity.avatarUrl} />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
            <User className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-sm font-semibold">
              {isGroup
                ? (thread?.subject ?? t("chat.teamChat"))
                : (identity?.displayName ?? thread?.subject ?? t("chat.winnerChat"))}
            </p>
            {identity && !isGroup && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label={t("chat.copyHandle", { handle: identity.handle })}
                title={
                  copied === identity.handle
                    ? t("chat.copied")
                    : t("chat.copyHandle", { handle: identity.handle })
                }
                onClick={() => void copyHandle(identity.handle)}
              >
                {copied === identity.handle ? <Check /> : <Copy />}
              </Button>
            )}
          </div>
          {identity && !isGroup && (
            <p className="truncate text-[10px] text-muted-foreground">{identity.handle}</p>
          )}
          {isGroup && (
            <div className="mt-1 flex max-w-[220px] min-w-0 items-center gap-1">
              {identities.slice(0, 2).map((member) => (
                <button
                  key={`${member.provider}:${member.providerUserId}`}
                  type="button"
                  className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-foreground"
                  title={t("chat.copyHandle", { handle: member.handle })}
                  onClick={() => void copyHandle(member.handle)}
                >
                  {copied === member.handle ? t("chat.copied") : member.handle}
                </button>
              ))}
              {identities.length > 2 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground"
                      aria-label={t("chat.showTeamMembers", { count: identities.length - 2 })}
                    >
                      +{identities.length - 2}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-64 border-border-strong bg-popover p-2"
                  >
                    <div className="max-h-56 space-y-1 overflow-y-auto">
                      {identities.map((member) => (
                        <button
                          key={`${member.provider}:${member.channelId}:${member.providerUserId}`}
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-2"
                          onClick={() => void copyHandle(member.handle)}
                        >
                          <ChatAvatar
                            name={member.displayName}
                            avatarUrl={member.avatarUrl}
                            className="size-6"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs">{member.handle}</span>
                          <BaseBrandIcon provider={member.provider} className="size-3.5 shrink-0" />
                          {copied === member.handle ? (
                            <Check className="size-3.5 shrink-0 text-emerald-400" />
                          ) : (
                            <Copy className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("chat.closeChat", { defaultValue: "Close chat" })}
          onClick={() => {
            setOpen(false);
            onClose?.();
          }}
        >
          <X />
        </Button>
      </header>

      <div role="log" aria-live="polite" className="min-h-32 flex-1 space-y-2 overflow-y-auto p-3">
        {loading && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t("chat.loadingMessages", { defaultValue: "Loading messages…" })}
          </p>
        )}
        {visibleMessages.map((item) => (
          <div key={item.id} className="flex gap-2 rounded-xl border border-border bg-card p-2.5">
            <ChatAvatar name={item.displayName} avatarUrl={item.avatarUrl} className="size-7" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="truncate font-medium text-foreground">{item.displayName}</span>
                <BaseBrandIcon provider={item.provider} className="size-3" />
                <time className="ml-auto shrink-0">
                  {new Date(item.occurredAt).toLocaleTimeString()}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs">{item.message}</p>
            </div>
          </div>
        ))}
        {thread && thread.messages.length > MAX_VISIBLE_CHAT_MESSAGES && (
          <p className="text-center text-[10px] text-muted-foreground">
            {t("chat.showingRecent", { count: MAX_VISIBLE_CHAT_MESSAGES })}
          </p>
        )}
        {!loading && thread && !thread.messages.length && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t("chat.noParticipantMessages")}
          </p>
        )}
      </div>

      <footer className="border-t border-border p-3">
        <div className="flex min-w-0 gap-2">
          <Input
            className="min-w-0 flex-1"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void send();
            }}
            disabled={!writer || sending}
            maxLength={500}
            placeholder={
              writer
                ? t("chat.reply", { defaultValue: "Reply in chat" })
                : t("chat.disconnected", { defaultValue: "Chat disconnected or read-only" })
            }
            aria-label={t("chat.reply", { defaultValue: "Reply in chat" })}
          />
          <Button
            size="icon"
            className="aspect-square shrink-0 rounded-none p-0"
            loading={sending}
            disabled={!writer || !message.trim()}
            aria-label={t("chat.sendMessage", { defaultValue: "Send message" })}
            onClick={() => void send()}
          >
            <Send />
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </footer>
    </aside>
  );
}
