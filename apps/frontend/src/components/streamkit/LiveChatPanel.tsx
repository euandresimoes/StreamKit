import type {
  ChatModerationAction,
  FocusedChatMessage,
  FocusedChatThread,
  LiveStream,
} from "@streamkit/contracts";
import { ArrowLeft, MoreHorizontal, Send, Shield, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { integrationApi } from "@/modules/integration/integration-api";
import { liveControlApi } from "@/modules/live-control/live-control-api";
import {
  MAX_QUEUED_CHAT_MESSAGES,
  MAX_VISIBLE_CHAT_MESSAGES,
} from "@/modules/performance/bounded-render-window";

function initials(displayName: string) {
  return displayName.trim().slice(0, 2).toUpperCase();
}

function badgeLabel(badge: string) {
  const value = badge.toLowerCase();
  if (value.includes("moderator") || value === "moderator") return "MOD";
  if (value.includes("owner") || value.includes("broadcaster")) return "OWNER";
  if (value.includes("subscriber") || value.includes("sponsor")) return "SUB";
  return badge.replace(/[_-]/g, " ").slice(0, 12);
}

function Avatar({ message }: { message: FocusedChatMessage }) {
  if (message.avatarUrl)
    return (
      <img
        src={message.avatarUrl}
        alt=""
        className="size-7 shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    );
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted-foreground">
      {initials(message.displayName)}
    </span>
  );
}

export function LiveChatPanel({ stream }: { stream: LiveStream | null }) {
  const [thread, setThread] = useState<FocusedChatThread | null>(null);
  const [displayedMessages, setDisplayedMessages] = useState<FocusedChatMessage[]>([]);
  const [privateUser, setPrivateUser] = useState<FocusedChatMessage | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [moderating, setModerating] = useState<string | null>(null);
  const displayedIds = useRef(new Set<string>());
  const queuedIds = useRef(new Set<string>());
  const queue = useRef<FocusedChatMessage[]>([]);
  const drainTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!stream) {
      setThread(null);
      setDisplayedMessages([]);
      displayedIds.current.clear();
      queuedIds.current.clear();
      queue.current = [];
      setError(null);
      return;
    }
    let active = true;
    let timer: number | undefined;
    let delay = 1_500;
    const drain = () => {
      if (!active || !queue.current.length) return;
      const next = queue.current.shift();
      if (!next) return;
      queuedIds.current.delete(next.id);
      displayedIds.current.add(next.id);
      while (displayedIds.current.size > MAX_QUEUED_CHAT_MESSAGES) {
        const oldest = displayedIds.current.values().next().value;
        if (!oldest) break;
        displayedIds.current.delete(oldest);
      }
      setDisplayedMessages((items) => [...items, next].slice(-MAX_VISIBLE_CHAT_MESSAGES));
      drainTimer.current = window.setTimeout(drain, 120);
    };
    const load = async () => {
      try {
        const next = await liveControlApi.chat(stream.connectionId);
        if (active) {
          setThread(next);
          const incoming = next.messages.filter(
            (item) => !displayedIds.current.has(item.id) && !queuedIds.current.has(item.id),
          );
          for (const item of incoming.slice(-MAX_VISIBLE_CHAT_MESSAGES)) {
            queuedIds.current.add(item.id);
            queue.current.push(item);
          }
          while (queue.current.length > MAX_QUEUED_CHAT_MESSAGES) {
            const dropped = queue.current.shift();
            if (dropped) queuedIds.current.delete(dropped.id);
          }
          drain();
          setError(null);
          delay = 1_500;
        }
      } catch (cause) {
        delay = Math.min(delay * 2, 15_000);
        if (active)
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar o chat.");
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
      if (drainTimer.current) window.clearTimeout(drainTimer.current);
    };
  }, [stream]);

  const writer = thread?.connections.find(
    (item) => item.status === "connected" && item.capabilities.includes("chat.write"),
  );
  const privateMessages = privateUser
    ? displayedMessages.filter((item) => item.providerUserId === privateUser.providerUserId)
    : [];
  const send = async () => {
    if (!writer || !message.trim()) return;
    setSending(true);
    try {
      await integrationApi.sendMessage(writer.id, message.trim());
      setMessage("");
    } catch {
      setError("Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  const canModerate = (action: ChatModerationAction) => {
    if (!writer) return false;
    const capability =
      action === "delete_message"
        ? "chat.message.delete"
        : action === "pin_message"
          ? "chat.message.pin"
          : "chat.user.ban";
    return writer.capabilities.includes(capability);
  };

  const moderate = async (item: FocusedChatMessage, action: ChatModerationAction) => {
    if (!stream || !canModerate(action)) return;
    setModerating(`${item.id}:${action}`);
    try {
      await liveControlApi.moderateChat(stream.connectionId, {
        action,
        externalMessageId: item.externalEventId,
        providerUserId: item.providerUserId,
      });
      if (action === "delete_message")
        setDisplayedMessages((items) => items.filter((messageItem) => messageItem.id !== item.id));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível executar a ação.");
    } finally {
      setModerating(null);
    }
  };

  if (privateUser)
    return (
      <section className="relative flex h-full min-h-64 flex-col bg-card">
        <header className="flex items-center gap-2 border-b border-border px-3 py-3 text-sm font-semibold">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Voltar para o chat da live"
            onClick={() => setPrivateUser(null)}
          >
            <ArrowLeft />
          </Button>
          <Avatar message={privateUser} />
          <div className="min-w-0">
            <p className="truncate">{privateUser.displayName}</p>
            <p className="text-[10px] font-normal text-muted-foreground">Chat privado</p>
          </div>
        </header>
        <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {privateMessages.map((item) => (
            <article key={item.id} className="flex gap-2 rounded-lg bg-surface-2 px-2 py-2 text-xs">
              <Avatar message={item} />
              <div className="min-w-0">
                <p className="font-semibold">{item.displayName}</p>
                <p className="break-words text-muted-foreground">{item.message}</p>
              </div>
            </article>
          ))}
          {!privateMessages.length && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma mensagem desse usuário ainda.
            </p>
          )}
        </div>
      </section>
    );

  return (
    <section className="relative flex h-full min-h-64 flex-col bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        {stream && <BaseBrandIcon provider={stream.provider} />}
        Chat da live
      </header>
      <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {displayedMessages.map((item) => (
          <article
            key={item.id}
            className="group flex gap-2 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-surface-2 motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:fade-in motion-reduce:animate-none"
          >
            <Avatar message={item} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="truncate font-semibold hover:text-primary"
                  onClick={() => setPrivateUser(item)}
                >
                  {item.displayName}
                </button>
                {item.badges.slice(0, 4).map((badge) => (
                  <span
                    key={badge}
                    className="rounded bg-primary/10 px-1 text-[9px] text-primary"
                    title={badge}
                  >
                    {badgeLabel(badge)}
                  </span>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto size-6 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Ações para ${item.displayName}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setPrivateUser(item)}>
                      <UserRound /> Abrir chat privado
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!canModerate("delete_message") || moderating !== null}
                      onSelect={() => void moderate(item, "delete_message")}
                    >
                      <Shield /> Excluir mensagem
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canModerate("pin_message") || moderating !== null}
                      onSelect={() => void moderate(item, "pin_message")}
                    >
                      Fixar mensagem
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canModerate("ban_user") || moderating !== null}
                      onSelect={() => void moderate(item, "ban_user")}
                    >
                      Banir usuário
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="break-words text-muted-foreground">{item.message}</p>
            </div>
          </article>
        ))}
        {!displayedMessages.length && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {stream ? "Nenhuma mensagem recente." : "Chat aguardando uma transmissão conectada."}
          </p>
        )}
      </div>
      <footer className="border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void send();
            }}
            disabled={!writer || sending}
            placeholder={writer ? "Responder no chat" : "Chat somente leitura"}
            aria-label="Responder no chat"
          />
          <Button
            size="icon"
            aria-label="Enviar mensagem"
            disabled={!writer || !message.trim()}
            loading={sending}
            onClick={() => void send()}
          >
            <Send />
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </footer>
    </section>
  );
}
