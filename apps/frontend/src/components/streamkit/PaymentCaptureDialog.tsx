import { DollarSign, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { BaseDateTimePicker } from "@/components/base/BaseDateTimePicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLiveSelection } from "@/modules/live-control/use-live-control";
import { useParticipantCaptureRules } from "@/modules/integration/use-participant-capture-rules";

type PaymentCaptureDraft = {
  connectionId: string | null;
  endsAt: string;
  minimumAmount: string;
  currency: string;
  startsAt: string;
};

const defaultDraft: PaymentCaptureDraft = {
  connectionId: null,
  endsAt: "",
  minimumAmount: "1",
  currency: "BRL",
  startsAt: "",
};

function draftKey(target: "giveaway" | "tournament", targetId: string) {
  return `streamkit:payment-capture-draft:${target}:${targetId}`;
}

function readDraft(target: "giveaway" | "tournament", targetId: string): PaymentCaptureDraft {
  try {
    const saved = window.localStorage.getItem(draftKey(target, targetId));
    return saved
      ? { ...defaultDraft, ...(JSON.parse(saved) as Partial<PaymentCaptureDraft>) }
      : defaultDraft;
  } catch {
    return defaultDraft;
  }
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function PaymentCaptureDialog({
  open,
  onOpenChange,
  target,
  targetId,
  onRefresh,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  target: "giveaway" | "tournament";
  targetId: string;
  onRefresh(): Promise<void>;
}) {
  const { t } = useTranslation();
  const live = useLiveSelection();
  const captures = useParticipantCaptureRules(target, targetId, onRefresh);
  const [draft, setDraft] = useState(() => readDraft(target, targetId));
  const updateDraft = (patch: Partial<PaymentCaptureDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey(target, targetId), JSON.stringify(draft));
    } catch {
      // Continue with in-memory state when storage is unavailable.
    }
  }, [draft, target, targetId]);

  const effectiveConnectionId =
    (live.selectedId && captures.connections.some((item) => item.id === live.selectedId)
      ? live.selectedId
      : null) ??
    (draft.connectionId && captures.connections.some((item) => item.id === draft.connectionId)
      ? draft.connectionId
      : null) ??
    captures.connections[0]?.id ??
    null;
  const currentConnection = captures.connections.find(
    (connection) => connection.id === effectiveConnectionId,
  );
  const currentRule = captures.rules.find(
    (rule) => rule.connectionId === effectiveConnectionId && rule.livepix?.autoEntry,
  );
  const isCapturing = currentRule?.status === "active";
  const minimumAmount = Number(draft.minimumAmount.replace(",", "."));
  const canStart =
    Boolean(effectiveConnectionId) &&
    Number.isFinite(minimumAmount) &&
    minimumAmount > 0 &&
    /^[A-Z]{3,12}$/.test(draft.currency.trim().toUpperCase());

  const saveCapture = () => {
    if (!effectiveConnectionId || !canStart) return;
    void captures.save({
      connectionId: effectiveConnectionId,
      endsAt: toIso(draft.endsAt),
      entryPolicy: "unique",
      excludeBots: true,
      excludeBroadcaster: true,
      excludeModerators: false,
      livepix: {
        autoEntry: true,
        currency: draft.currency.trim().toUpperCase(),
        minimumAmountInCents: Math.round(minimumAmount * 100),
      },
      match: "any",
      matchValue: null,
      membersOnly: false,
      startsAt: toIso(draft.startsAt),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-h-[85vh] max-w-lg overflow-y-auto border-border-strong bg-popover/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="size-5" /> Capture from payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!captures.connections.length || !currentConnection ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Connect and start a chat provider in Settings before capturing payment participants.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <span>{t("live.captureFrom")}</span>
                {captures.connections.length > 1 ? (
                  <Select
                    value={effectiveConnectionId ?? ""}
                    onValueChange={(value) => updateDraft({ connectionId: value })}
                  >
                    <SelectTrigger className="h-7 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {captures.connections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          <span className="flex items-center gap-2">
                            <BaseBrandIcon provider={connection.provider} className="size-3.5" />
                            {connection.channelDisplayName}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                    <BaseBrandIcon provider={currentConnection.provider} className="size-4" />
                    {currentConnection.channelDisplayName}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-border bg-card/45 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Capture confirmed LivePix payments</p>
                <p className="mt-1">
                  The donor username from the payment becomes a pending participant and is linked to
                  the matching chat handle when that user sends a message.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Minimum amount
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={draft.minimumAmount}
                    onChange={(event) => updateDraft({ minimumAmount: event.target.value })}
                    placeholder="1.00"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Currency
                  <Input
                    className="uppercase"
                    maxLength={12}
                    value={draft.currency}
                    onChange={(event) =>
                      updateDraft({ currency: event.target.value.toUpperCase() })
                    }
                    placeholder="BRL"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <BaseDateTimePicker
                  value={draft.startsAt}
                  onChange={(value) => updateDraft({ startsAt: value })}
                  ariaLabel="Payment capture start"
                  placeholder="Start now"
                />
                <BaseDateTimePicker
                  value={draft.endsAt}
                  onChange={(value) => updateDraft({ endsAt: value })}
                  ariaLabel="Payment capture end"
                  placeholder="No end time"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <span>{currentRule?.capturedCount ?? 0} payment participants captured</span>
                <span>{currentConnection.provider.toUpperCase()} chat matching</span>
              </div>
              <Button
                className="w-full"
                loading={captures.busy}
                disabled={!canStart}
                onClick={() => {
                  if (isCapturing && currentRule) {
                    void captures.setStatus(currentRule.id, "paused");
                    return;
                  }
                  saveCapture();
                }}
              >
                <Radio /> {isCapturing ? "Stop capturing payments" : "Start capturing payments"} (
                {currentRule?.capturedCount ?? 0})
              </Button>
            </>
          )}
          {captures.error && <p className="text-xs text-destructive">{captures.error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
