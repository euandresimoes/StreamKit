import type { GiveawayCaptureEntryPolicy, GiveawayCaptureMatch } from "@streamlet/contracts";
import { Radio } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BaseDateTimePicker } from "@/components/base/BaseDateTimePicker";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { captureButtonLabel } from "@/modules/integration/capture-presentation";
import { useParticipantCaptureRules } from "@/modules/integration/use-participant-capture-rules";
import { useLiveSelection } from "@/modules/live-control/use-live-control";

type CaptureDraft = {
  connectionId: string | null;
  endsAt: string;
  entryPolicy: GiveawayCaptureEntryPolicy;
  excludeBots: boolean;
  excludeBroadcaster: boolean;
  excludeModerators: boolean;
  match: GiveawayCaptureMatch;
  matchValue: string;
  membersOnly: boolean;
  startsAt: string;
};

const defaultDraft: CaptureDraft = {
  connectionId: null,
  endsAt: "",
  entryPolicy: "unique",
  excludeBots: true,
  excludeBroadcaster: true,
  excludeModerators: false,
  match: "exact",
  matchValue: "!participar",
  membersOnly: false,
  startsAt: "",
};

function draftKey(target: "giveaway" | "tournament", targetId: string) {
  return `streamlet:capture-draft:${target}:${targetId}`;
}

function readDraft(target: "giveaway" | "tournament", targetId: string): CaptureDraft {
  try {
    const value = window.localStorage.getItem(draftKey(target, targetId));
    if (!value) return defaultDraft;
    const parsed = JSON.parse(value) as Partial<CaptureDraft>;
    return { ...defaultDraft, ...parsed };
  } catch {
    return defaultDraft;
  }
}

export function ParticipantChatCapturePanel({
  target,
  targetId,
  participantCount,
  temporarilyPaused = false,
  onRefresh,
}: {
  target: "giveaway" | "tournament";
  targetId: string;
  participantCount: number;
  temporarilyPaused?: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const captures = useParticipantCaptureRules(target, targetId, onRefresh);
  const { selectedId: connectionId } = useLiveSelection();
  const [draft, setDraft] = useState<CaptureDraft>(() => readDraft(target, targetId));
  const updateDraft = (patch: Partial<CaptureDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey(target, targetId), JSON.stringify(draft));
    } catch {
      // Continue with in-memory form state when storage is unavailable.
    }
  }, [draft, target, targetId]);

  // If the channel is connected but currently offline, it is not present in the
  // live selector. Keep chat capture usable for the single connected provider;
  // actual messages will arrive when that channel has chat activity.
  const effectiveConnectionId =
    (connectionId && captures.connections.some((item) => item.id === connectionId)
      ? connectionId
      : null) ??
    (draft.connectionId && captures.connections.some((item) => item.id === draft.connectionId)
      ? draft.connectionId
      : null) ??
    captures.connections[0]?.id ??
    null;
  const currentRule = captures.rules.find((rule) => rule.connectionId === effectiveConnectionId);
  const currentConnection = captures.connections.find(
    (connection) => connection.id === effectiveConnectionId,
  );
  const isCapturing = currentRule?.status === "active";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!captures.connections.length || !currentConnection ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            {t("live.connectChatBeforeCapture")}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
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
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={draft.match}
              onValueChange={(value) => updateDraft({ match: value as GiveawayCaptureMatch })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("live.anyMessage")}</SelectItem>
                <SelectItem value="exact">{t("live.exactMessage")}</SelectItem>
                <SelectItem value="prefix">{t("live.prefix")}</SelectItem>
                <SelectItem value="contains">{t("live.containsText")}</SelectItem>
              </SelectContent>
            </Select>
            {target === "giveaway" ? (
              <Select
                value={draft.entryPolicy}
                onValueChange={(value) =>
                  updateDraft({ entryPolicy: value as GiveawayCaptureEntryPolicy })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unique">{t("live.oneEntry")}</SelectItem>
                  <SelectItem value="tickets">{t("live.messageBecomesTicket")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-8 items-center rounded-md border border-border px-3 text-xs text-muted-foreground">
                {t("live.oneEntryPerPerson")}
              </div>
            )}
          </div>
          {draft.match !== "any" && (
            <Input
              className="h-8"
              value={draft.matchValue}
              onChange={(event) => updateDraft({ matchValue: event.target.value })}
              placeholder={t("live.captureMessagePlaceholder")}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <BaseDateTimePicker
              value={draft.startsAt}
              onChange={(value) => updateDraft({ startsAt: value })}
              ariaLabel={t("live.captureStart")}
              placeholder={t("live.startNow")}
            />
            <BaseDateTimePicker
              value={draft.endsAt}
              onChange={(value) => updateDraft({ endsAt: value })}
              ariaLabel={t("live.captureEnd")}
              placeholder={t("live.noEndTime")}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3 text-[11px]">
            <CaptureSwitch
              label={t("live.ignoreBots")}
              checked={draft.excludeBots}
              onChange={(value) => updateDraft({ excludeBots: value })}
            />
            <CaptureSwitch
              label={t("live.ignoreStreamer")}
              checked={draft.excludeBroadcaster}
              onChange={(value) => updateDraft({ excludeBroadcaster: value })}
            />
            <CaptureSwitch
              label={t("live.ignoreModerators")}
              checked={draft.excludeModerators}
              onChange={(value) => updateDraft({ excludeModerators: value })}
            />
            <CaptureSwitch
              label={t("live.membersOnly")}
              checked={draft.membersOnly}
              onChange={(value) => updateDraft({ membersOnly: value })}
            />
          </div>
          <Button
            className="w-full"
            size="sm"
            loading={captures.busy}
            disabled={
              temporarilyPaused ||
              !effectiveConnectionId ||
              (draft.match !== "any" && !draft.matchValue.trim())
            }
            onClick={() => {
              if (isCapturing && currentRule) {
                void captures.setStatus(currentRule.id, "paused");
                return;
              }
              void captures.save({
                connectionId: effectiveConnectionId ?? "",
                endsAt: toIso(draft.endsAt),
                entryPolicy: draft.entryPolicy,
                excludeBots: draft.excludeBots,
                excludeBroadcaster: draft.excludeBroadcaster,
                excludeModerators: draft.excludeModerators,
                match: draft.match,
                matchValue: draft.match === "any" ? null : draft.matchValue.trim(),
                membersOnly: draft.membersOnly,
                startsAt: toIso(draft.startsAt),
                livepix: null,
              });
            }}
          >
            <Radio />{" "}
            {captureButtonLabel(
              isCapturing,
              participantCount,
              temporarilyPaused && Boolean(currentRule),
              t as unknown as (key: string, options?: Record<string, unknown>) => string,
            )}
          </Button>
        </div>
      )}
      {captures.error && <p className="mt-2 text-xs text-destructive">{captures.error}</p>}
    </div>
  );
}

function CaptureSwitch({
  label,
  checked,
  onChange,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
