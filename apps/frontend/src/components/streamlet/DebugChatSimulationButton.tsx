import { Bug } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChatSimulationStatus } from "@streamlet/contracts";

import { BaseModal } from "@/components/base/BaseModal";
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
import { useParticipantCaptureRules } from "@/modules/integration/use-participant-capture-rules";

type SimulationCount = 8 | 16 | 32 | 1000 | 10000;
type SimulationMode = "instant" | "gradual" | "burst";

export function DebugChatSimulationButton({
  target,
  targetId,
  onProgress,
}: {
  target: "giveaway" | "tournament";
  targetId: string;
  onProgress: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const captures = useParticipantCaptureRules(target, targetId, onProgress);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<SimulationCount>(8);
  const [message, setMessage] = useState("!participar");
  const [mode, setMode] = useState<SimulationMode>("instant");
  const [duplicateEvery, setDuplicateEvery] = useState("0");
  const [status, setStatus] = useState<ChatSimulationStatus | null>(null);

  if (!import.meta.env.DEV) return null;

  const simulate = async () => {
    const normalizedMessage = message.trim();
    const normalizedDuplicateEvery = Number(duplicateEvery);
    if (
      !normalizedMessage ||
      !Number.isInteger(normalizedDuplicateEvery) ||
      normalizedDuplicateEvery < 0 ||
      normalizedDuplicateEvery > 1000
    )
      return;

    setBusy(true);
    setError(null);
    try {
      const activeRule = captures.rules.find((rule) => rule.status === "active");
      const activeConnection = activeRule
        ? captures.connections.find((connection) => connection.id === activeRule.connectionId)
        : undefined;
      const provider = activeConnection?.provider ?? "twitch";
      const channelId = activeConnection?.channelId ?? `debug-${target}-${targetId}`;

      if (!activeRule || !activeConnection) {
        const connection = await integrationApi.ensureSimulationConnection({
          channelDisplayName: `Simulation · ${target}`,
          channelId,
          provider,
        });
        const saved = await captures.save({
          connectionId: connection.id,
          endsAt: null,
          entryPolicy: "unique",
          excludeBots: true,
          excludeBroadcaster: true,
          excludeModerators: false,
          match: "exact",
          matchValue: normalizedMessage,
          membersOnly: false,
          startsAt: null,
        });
        if (!saved) throw new Error(t("errors.genericOperation"));
      }

      setStatus(
        await integrationApi.startSimulation({
          channelId,
          count,
          duplicateEvery: normalizedDuplicateEvery,
          message: normalizedMessage,
          mode,
          provider,
        }),
      );
      await waitForSimulationCompletion((nextStatus) => setStatus(nextStatus));
      await onProgress();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("debug.simulationError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        aria-label={t("debug.configure")}
        onClick={() => {
          setError(null);
          setStatus(null);
          setOpen(true);
        }}
      >
        <Bug /> {t("debug.button")}
      </Button>
      <BaseModal
        open={open}
        onOpenChange={(nextOpen) => {
          if (!busy) setOpen(nextOpen);
        }}
        title={t("debug.title")}
        description={t("debug.description")}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("debug.messages")}>
              <Select
                value={String(count)}
                onValueChange={(value) => setCount(Number(value) as SimulationCount)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[8, 16, 32, 1000, 10000].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value.toLocaleString("en-US")} {t("debug.users")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("debug.mode")}>
              <Select value={mode} onValueChange={(value) => setMode(value as SimulationMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">{t("debug.instant")}</SelectItem>
                  <SelectItem value="gradual">{t("debug.gradual")}</SelectItem>
                  <SelectItem value="burst">{t("debug.burst")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={t("debug.message")}>
            <Input
              value={message}
              maxLength={500}
              placeholder={t("live.captureMessagePlaceholder")}
              onChange={(event) => setMessage(event.target.value)}
            />
          </Field>
          <Field label={t("debug.duplicateEvery")}>
            <Input
              type="number"
              min={0}
              max={1000}
              step={1}
              value={duplicateEvery}
              onChange={(event) => setDuplicateEvery(event.target.value)}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">{t("debug.duplicateHint")}</p>
          </Field>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {status && (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
              <div className="flex justify-between gap-3">
                <span>{status.running ? t("debug.running") : t("debug.complete")}</span>
                <span>
                  {status.processedCount.toLocaleString("en-US")} / {count.toLocaleString("en-US")}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${Math.min(100, (status.processedCount / count) * 100)}%` }}
                />
              </div>
              <p className="mt-2">
                {status.receivedCount.toLocaleString("en-US")} {t("debug.received")} ·{" "}
                {t("debug.queue")} {status.queueDepth}
                {status.handlerFailures > 0 &&
                  ` · ${status.handlerFailures} ${t("debug.handlerFailures")}`}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={
                !message.trim() ||
                !Number.isInteger(Number(duplicateEvery)) ||
                Number(duplicateEvery) < 0 ||
                Number(duplicateEvery) > 1000
              }
              onClick={() => void simulate()}
            >
              Run simulation
            </Button>
          </div>
        </div>
      </BaseModal>
    </>
  );
}

async function waitForSimulationCompletion(
  onStatus: (status: ChatSimulationStatus) => void,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 300_000) {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const status = await integrationApi.simulationStatus();
    onStatus(status);
    if (!status.running) {
      if (status.handlerFailures > 0) {
        throw new Error(`${status.handlerFailures} simulation handler failures occurred.`);
      }
      return;
    }
  }
  throw new Error("The simulation did not finish within five minutes.");
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block text-xs font-medium">
      <span className="mb-1.5 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
