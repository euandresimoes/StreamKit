import type { FocusedChatThread } from "@streamkit/contracts";
import { Check, Copy, MessageCircle, Send, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { Input } from "@/components/ui/input";
import { copyText } from "@/infrastructure/clipboard";
import { integrationApi } from "@/modules/integration/integration-api";

export function FocusedChatPanel({
  target,
  targetId,
}: {
  target: "giveaways" | "tournaments";
  targetId: string;
}) {
  const [thread, setThread] = useState<FocusedChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setOpen(true);
    let active = true;
    const load = async () => {
      try {
        const value = await integrationApi.focusedChat(target, targetId);
        if (active) {
          setThread(value);
          setError(null);
          setLoading(false);
        }
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar o chat.");
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 1_500);
    return () => {
      active = false;
      clearInterval(timer);
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
  const identity = thread?.identities[0] ?? null;

  const copyHandle = async (handle: string) => {
    setError(null);
    try {
      await copyText(handle);
      setCopied(handle);
      setTimeout(() => setCopied(null), 1_500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível copiar o handle.");
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
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Button
        className="fixed bottom-5 right-5 z-40 rounded-full shadow-2xl"
        size="icon"
        aria-label="Reabrir chat do vencedor"
        title="Reabrir chat do vencedor"
        onClick={() => setOpen(true)}
      >
        <MessageCircle />
      </Button>
    );
  }

  return (
    <aside
      aria-label="Chat focado"
      className="glass-panel fixed bottom-5 right-5 z-40 flex max-h-[70vh] w-[360px] flex-col overflow-hidden rounded-3xl border border-border-strong bg-popover/95 shadow-2xl"
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        {identity?.avatarUrl ? (
          <img
            className="size-9 shrink-0 rounded-full object-cover"
            src={identity.avatarUrl}
            alt={`Avatar de ${identity.displayName}`}
          />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
            <User className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-sm font-semibold">
              {identity?.displayName ?? thread?.subject ?? "Chat do vencedor"}
            </p>
            {identity && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label={`Copiar ${identity.handle}`}
                title={copied === identity.handle ? "Copiado" : "Copiar handle"}
                onClick={() => void copyHandle(identity.handle)}
              >
                {copied === identity.handle ? <Check /> : <Copy />}
              </Button>
            )}
          </div>
          {identity && (
            <p className="truncate text-[10px] text-muted-foreground">{identity.handle}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fechar chat"
          onClick={() => setOpen(false)}
        >
          <X />
        </Button>
      </header>

      <div role="log" aria-live="polite" className="min-h-32 flex-1 space-y-2 overflow-y-auto p-3">
        {loading && (
          <p className="py-8 text-center text-xs text-muted-foreground">Carregando mensagens…</p>
        )}
        {thread?.messages.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-2.5">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground">{item.displayName}</span>
              <BaseBrandIcon provider={item.provider} className="size-3" />
              <time className="ml-auto">{new Date(item.occurredAt).toLocaleTimeString()}</time>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs">{item.message}</p>
          </div>
        ))}
        {!loading && thread && !thread.messages.length && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Nenhuma mensagem recente deste participante.
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
            placeholder={writer ? "Responder no chat" : "Chat desconectado ou somente leitura"}
            aria-label="Responder no chat"
          />
          <Button
            size="icon"
            className="aspect-square shrink-0 rounded-full p-0"
            loading={sending}
            disabled={!writer || !message.trim()}
            aria-label="Enviar mensagem"
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
