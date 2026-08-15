import type { FocusedChatThread } from "@streamkit/contracts";
import { MessageCircle, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { integrationApi } from "@/modules/integration/integration-api";

export function TournamentMatchChat({
  tournamentId,
  matchId,
}: {
  tournamentId: string;
  matchId: string;
}) {
  return (
    <div className="mt-4 grid min-h-56 grid-cols-2 gap-3">
      <MatchSideChat tournamentId={tournamentId} matchId={matchId} side="left" />
      <MatchSideChat tournamentId={tournamentId} matchId={matchId} side="right" />
    </div>
  );
}

function MatchSideChat({
  tournamentId,
  matchId,
  side,
}: {
  tournamentId: string;
  matchId: string;
  side: "left" | "right";
}) {
  const [thread, setThread] = useState<FocusedChatThread | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const requestVersion = useRef(0);
  useEffect(() => {
    let active = true;
    const version = ++requestVersion.current;
    const load = async () => {
      try {
        const value = await integrationApi.tournamentMatchChat(tournamentId, matchId, side);
        if (active && requestVersion.current === version) {
          setThread(value);
          setError(null);
        }
      } catch (cause) {
        if (active && requestVersion.current === version)
          setError(cause instanceof Error ? cause.message : "Could not load the chat.");
      }
    };
    void load();
    let timer: number | undefined;
    const schedule = () => {
      if (active)
        timer = window.setTimeout(async () => {
          await load();
          schedule();
        }, 1_500);
    };
    schedule();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [matchId, side, tournamentId]);
  const writer = thread?.connections.find(
    (connection) =>
      connection.status === "connected" && connection.capabilities.includes("chat.write"),
  );
  return (
    <section className="min-w-0 rounded-xl border border-border bg-background/40 p-3">
      <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
        <MessageCircle className="size-3.5 text-primary" />
        <p className="truncate text-[12px] font-semibold">{thread?.subject ?? "Loading…"}</p>
      </div>
      {!thread?.identities.length && (
        <p className="text-[11px] text-muted-foreground">
          Manually added participants do not have a linked chat.
        </p>
      )}
      <div className="max-h-44 space-y-2 overflow-y-auto">
        {thread?.messages.map((message) => (
          <div key={message.id} className="rounded-lg bg-muted/40 p-2 text-[11px]">
            <div className="mb-1 flex items-center gap-1.5 font-medium">
              {message.avatarUrl ? (
                <img src={message.avatarUrl} className="size-5 rounded-full" alt="" />
              ) : (
                <User className="size-4" />
              )}
              <span className="truncate">{message.handle}</span>
              <BaseBrandIcon provider={message.provider} className="ml-auto size-3.5" />
            </div>
            <p className="break-words text-muted-foreground">{message.message}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          className="h-8 min-w-0 text-[11px]"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={!writer}
          placeholder={writer ? "Reply in chat" : "Read-only"}
        />
        <Button
          size="icon"
          className="size-8 shrink-0"
          disabled={!writer || !message.trim()}
          loading={sending}
          onClick={async () => {
            if (!writer) return;
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
          }}
        >
          <Send className="size-3.5" />
        </Button>
      </div>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </section>
  );
}
