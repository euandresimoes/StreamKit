import type { FocusedChatThread } from "@streamkit/contracts";
import { MessageCircle, Send, User } from "lucide-react";
import { useEffect, useState } from "react";

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
  useEffect(() => {
    let active = true;
    const load = async () => {
      const value = await integrationApi.tournamentMatchChat(tournamentId, matchId, side);
      if (active) setThread(value);
    };
    void load();
    const timer = window.setInterval(() => void load(), 1_500);
    return () => {
      active = false;
      window.clearInterval(timer);
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
        <p className="truncate text-[12px] font-semibold">{thread?.subject ?? "Carregando…"}</p>
      </div>
      {!thread?.identities.length && (
        <p className="text-[11px] text-muted-foreground">
          Participantes manuais não possuem chat vinculado.
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
          placeholder={writer ? "Responder no chat" : "Somente leitura"}
        />
        <Button
          size="icon"
          className="size-8 shrink-0"
          disabled={!writer || !message.trim()}
          onClick={() => {
            if (!writer) return;
            void integrationApi.sendMessage(writer.id, message.trim()).then(() => setMessage(""));
          }}
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </section>
  );
}
