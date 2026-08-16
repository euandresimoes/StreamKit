import type { FocusedChatThread } from "@streamkit/contracts";
import { Check, Copy, MessageCircle, Send, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { Input } from "@/components/ui/input";
import { copyText } from "@/infrastructure/clipboard";
import { integrationApi } from "@/modules/integration/integration-api";
import { MAX_VISIBLE_CHAT_MESSAGES } from "@/modules/performance/bounded-render-window";

export function FocusedChatPanel({
  target,
  targetId,
  visible = true,
}: {
  target: "giveaways" | "tournaments";
  targetId: string;
  visible?: boolean;
}) {
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
  }, [visible]);

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
        if (active) setError(cause instanceof Error ? cause.message : "Could not load the chat.");
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
      setError(cause instanceof Error ? cause.message : "Could not copy the handle.");
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
      setError(cause instanceof Error ? cause.message : "Could not send the message.");
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
        aria-label="Reopen winner chat"
        title="Reopen winner chat"
        onClick={() => setOpen(true)}
      >
        <MessageCircle />
      </Button>
    );
  }

  return (
    <aside
      aria-label="Focused chat"
      className={`glass-panel fixed bottom-5 right-5 z-40 flex max-h-[70vh] w-[360px] flex-col overflow-hidden rounded-3xl border border-border-strong bg-popover/95 shadow-2xl ${panelVisible ? "motion-safe:animate-in motion-safe:slide-in-from-right-4" : "motion-safe:animate-out motion-safe:slide-out-to-right-4"}`}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        {identity?.avatarUrl ? (
          <img
            className="size-9 shrink-0 rounded-full object-cover"
            src={identity.avatarUrl}
            alt={`Avatar of ${identity.displayName}`}
          />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
            <User className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-sm font-semibold">
              {isGroup
                ? (thread?.subject ?? "Team chat")
                : (identity?.displayName ?? thread?.subject ?? "Winner chat")}
            </p>
            {identity && !isGroup && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label={`Copy ${identity.handle}`}
                title={copied === identity.handle ? "Copied" : "Copy handle"}
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
            <div className="mt-1 flex max-w-[220px] flex-wrap gap-1">
              {identities.map((member) => (
                <button
                  key={`${member.provider}:${member.providerUserId}`}
                  type="button"
                  className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-foreground"
                  title={`Copy ${member.handle}`}
                  onClick={() => void copyHandle(member.handle)}
                >
                  {copied === member.handle ? "Copied" : member.handle}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close chat"
          onClick={() => setOpen(false)}
        >
          <X />
        </Button>
      </header>

      <div role="log" aria-live="polite" className="min-h-32 flex-1 space-y-2 overflow-y-auto p-3">
        {loading && (
          <p className="py-8 text-center text-xs text-muted-foreground">Loading messages…</p>
        )}
        {visibleMessages.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-2.5">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground">{item.displayName}</span>
              <BaseBrandIcon provider={item.provider} className="size-3" />
              <time className="ml-auto">{new Date(item.occurredAt).toLocaleTimeString()}</time>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs">{item.message}</p>
          </div>
        ))}
        {thread && thread.messages.length > MAX_VISIBLE_CHAT_MESSAGES && (
          <p className="text-center text-[10px] text-muted-foreground">
            Showing the {MAX_VISIBLE_CHAT_MESSAGES} most recent messages.
          </p>
        )}
        {!loading && thread && !thread.messages.length && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No recent messages from this participant.
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
            placeholder={writer ? "Reply in chat" : "Chat disconnected or read-only"}
            aria-label="Reply in chat"
          />
          <Button
            size="icon"
            className="aspect-square shrink-0 rounded-none p-0"
            loading={sending}
            disabled={!writer || !message.trim()}
            aria-label="Send message"
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
