import type { ChatSimulationStatus } from "@streamkit/contracts";
import { FlaskConical, Square } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { integrationApi } from "@/modules/integration/integration-api";

export function ChatSimulationPanel({
  channelId,
  defaultMessage,
  enabled,
  provider,
}: {
  channelId: string;
  defaultMessage: string;
  enabled: boolean;
  provider: "kick" | "twitch" | "youtube";
}) {
  const [status, setStatus] = useState<ChatSimulationStatus | null>(null);
  const [count, setCount] = useState<8 | 16 | 32 | 1000 | 10000>(32);
  const [message, setMessage] = useState(defaultMessage);
  useEffect(() => setMessage(defaultMessage), [defaultMessage]);
  useEffect(() => {
    const timer = window.setInterval(
      () =>
        void integrationApi
          .simulationStatus()
          .then(setStatus)
          .catch(() => undefined),
      500,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="mt-4 rounded-xl border border-dashed border-border-strong p-3">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="size-4 text-primary" />
        <p className="text-[12px] font-semibold">Simulador de chat (debug)</p>
      </div>
      <div className="grid grid-cols-[110px_1fr_auto] gap-2">
        <Select
          value={String(count)}
          onValueChange={(value) => setCount(Number(value) as typeof count)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[8, 16, 32, 1000, 10000].map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value} usuários
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="!join"
        />
        {status?.running ? (
          <Button
            variant="outline"
            size="icon"
            onClick={() => void integrationApi.stopSimulation().then(setStatus)}
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            disabled={!enabled}
            onClick={() =>
              void integrationApi
                .startSimulation({
                  channelId,
                  count,
                  duplicateEvery: 0,
                  message,
                  mode: count >= 1000 ? "burst" : "instant",
                  provider,
                })
                .then(setStatus)
            }
          >
            Simular
          </Button>
        )}
      </div>
      {!enabled && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Inicie a captura acima antes de executar a simulação.
        </p>
      )}
      {status && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {status.receivedCount} recebidos · {status.processedCount} processados ·{" "}
          {status.duplicateCount} duplicados · fila {status.queueDepth}
        </p>
      )}
    </section>
  );
}
