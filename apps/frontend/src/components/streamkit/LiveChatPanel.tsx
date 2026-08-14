import type { FocusedChatThread, LiveStream } from "@streamkit/contracts";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { integrationApi } from "@/modules/integration/integration-api";
import { liveControlApi } from "@/modules/live-control/live-control-api";
import { MAX_VISIBLE_CHAT_MESSAGES } from "@/modules/performance/bounded-render-window";

export function LiveChatPanel({ stream }: { stream: LiveStream | null }) {
  const [thread, setThread] = useState<FocusedChatThread | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!stream) {
      setThread(null);
      setError(null);
      return;
    }
    let active = true;
    let timer: number | undefined;
    let delay = 1_500;
    const load = async () => {
      try {
        const next = await liveControlApi.chat(stream.connectionId);
        if (active) {
          setThread(next);
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
    };
  }, [stream]);
  const writer = thread?.connections.find(
    (item) => item.status === "connected" && item.capabilities.includes("chat.write"),
  );
  const visibleMessages = thread?.messages.slice(-MAX_VISIBLE_CHAT_MESSAGES) ?? [];
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
  return (
    <section className="flex min-h-64 flex-col rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        {stream && <BaseBrandIcon provider={stream.provider} />}
        Chat da live
      </header>
      <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visibleMessages.map((item) => (
          <div key={item.id} className="rounded-xl bg-surface-2 px-3 py-2 text-xs">
            <span className="font-semibold">{item.displayName}</span>
            <span className="ml-2 text-muted-foreground">{item.message}</span>
          </div>
        ))}
        {thread && thread.messages.length > MAX_VISIBLE_CHAT_MESSAGES && (
          <p className="text-center text-[10px] text-muted-foreground">
            Exibindo as {MAX_VISIBLE_CHAT_MESSAGES} mensagens mais recentes.
          </p>
        )}
        {!thread?.messages.length && (
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
