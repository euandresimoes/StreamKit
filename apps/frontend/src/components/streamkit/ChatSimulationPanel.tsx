import type { ChatSimulationStatus } from "@streamkit/contracts";
import { FlaskConical, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  onProgress,
  provider,
}: {
  channelId: string;
  defaultMessage: string;
  enabled: boolean;
  onProgress?: () => Promise<void>;
  provider: "kick" | "twitch" | "youtube";
}) {
  const [status, setStatus] = useState<ChatSimulationStatus | null>(null);
  const [count, setCount] = useState<8 | 16 | 32 | 1000 | 10000>(32);
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string | null>(null);
  const processedCountRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  useEffect(() => setMessage(defaultMessage), [defaultMessage]);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);
  useEffect(() => {
    const timer = window.setInterval(
      () =>
        void integrationApi
          .simulationStatus()
          .then((next) => {
            setStatus(next);
            if (next.processedCount !== processedCountRef.current) {
              processedCountRef.current = next.processedCount;
              void onProgressRef.current?.();
            }
          })
          .catch(() => undefined),
      500,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="mt-4 rounded-xl border border-dashed border-border-strong p-3">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="size-4 text-primary" />
        <p className="text-[12px] font-semibold">Chat simulator (debug)</p>
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
                {value} users
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
            onClick={async () => {
              setError(null);
              try {
                setStatus(await integrationApi.stopSimulation());
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not stop the simulation.");
              }
            }}
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            disabled={!enabled}
            onClick={async () => {
              setError(null);
              try {
                setStatus(
                  await integrationApi.startSimulation({
                    channelId,
                    count,
                    duplicateEvery: 0,
                    message,
                    mode: count >= 1000 ? "burst" : "instant",
                    provider,
                  }),
                );
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Could not start the simulation.",
                );
              }
            }}
          >
            Simulate
          </Button>
        )}
      </div>
      {!enabled && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Start capture above before running the simulation.
        </p>
      )}
      {status && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {status.receivedCount} received · {status.processedCount} processed ·{" "}
          {status.duplicateCount} duplicates · queue {status.queueDepth}
        </p>
      )}
      {error && <p className="mt-2 text-[10px] text-destructive">{error}</p>}
    </section>
  );
}
