import type { GiveawayCaptureEntryPolicy, GiveawayCaptureMatch } from "@streamkit/contracts";
import { Radio } from "lucide-react";
import { type ReactNode, useState } from "react";

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
import { ChatSimulationPanel } from "./ChatSimulationPanel";

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
  const captures = useParticipantCaptureRules(target, targetId, onRefresh);
  const { selectedId: connectionId } = useLiveSelection();
  const [match, setMatch] = useState<GiveawayCaptureMatch>("exact");
  const [matchValue, setMatchValue] = useState("!participar");
  const [entryPolicy, setEntryPolicy] = useState<GiveawayCaptureEntryPolicy>("unique");
  const [excludeBots, setExcludeBots] = useState(true);
  const [excludeBroadcaster, setExcludeBroadcaster] = useState(true);
  const [excludeModerators, setExcludeModerators] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [livepixAutoEntry, setLivepixAutoEntry] = useState(false);
  const [livepixMinimum, setLivepixMinimum] = useState("1");
  const [livepixCurrency, setLivepixCurrency] = useState("BRL");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const currentRule = captures.rules.find((rule) => rule.connectionId === connectionId);
  const currentConnection = captures.connections.find(
    (connection) => connection.id === connectionId,
  );
  const isCapturing = currentRule?.status === "active";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!captures.connections.length || !currentConnection ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Connect and start a chat provider in settings to capture participants.
          </div>
          {import.meta.env.DEV && (
            <ChatSimulationPanel
              channelId={`debug-${target}-${targetId}`}
              defaultMessage={match === "any" ? "simulated message" : matchValue.trim()}
              enabled
              onProgress={onRefresh}
              provider="twitch"
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Capturing from{" "}
            <span className="font-medium text-foreground">
              {currentConnection.channelDisplayName}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={match}
              onValueChange={(value) => setMatch(value as GiveawayCaptureMatch)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any message</SelectItem>
                <SelectItem value="exact">Exact message</SelectItem>
                <SelectItem value="prefix">Prefix</SelectItem>
                <SelectItem value="contains">Contains text</SelectItem>
              </SelectContent>
            </Select>
            {target === "giveaway" ? (
              <Select
                value={entryPolicy}
                onValueChange={(value) => setEntryPolicy(value as GiveawayCaptureEntryPolicy)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unique">One entry</SelectItem>
                  <SelectItem value="tickets">Message becomes a ticket</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-8 items-center rounded-md border border-border px-3 text-xs text-muted-foreground">
                One entry per person
              </div>
            )}
          </div>
          {match !== "any" && (
            <Input
              className="h-8"
              value={matchValue}
              onChange={(event) => setMatchValue(event.target.value)}
              placeholder="!participar"
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <BaseDateTimePicker
              value={startsAt}
              onChange={setStartsAt}
              ariaLabel="Capture start"
              placeholder="Start now"
            />
            <BaseDateTimePicker
              value={endsAt}
              onChange={setEndsAt}
              ariaLabel="Capture end"
              placeholder="No end time"
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3 text-[11px]">
            <CaptureSwitch label="Ignorar bots" checked={excludeBots} onChange={setExcludeBots} />
            <CaptureSwitch
              label="Ignorar streamer"
              checked={excludeBroadcaster}
              onChange={setExcludeBroadcaster}
            />
            <CaptureSwitch
              label="Ignorar moderadores"
              checked={excludeModerators}
              onChange={setExcludeModerators}
            />
            <CaptureSwitch
              label="Somente membros"
              checked={membersOnly}
              onChange={setMembersOnly}
            />
          </div>
          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <CaptureSwitch
              label={
                <span className="flex items-center gap-2">
                  <BaseBrandIcon provider="livepix" className="size-4" />
                  Capture received LivePix payments
                </span>
              }
              checked={livepixAutoEntry}
              onChange={setLivepixAutoEntry}
            />
            {livepixAutoEntry && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="h-8"
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={livepixMinimum}
                  onChange={(event) => setLivepixMinimum(event.target.value)}
                  placeholder="Minimum amount"
                  aria-label="LivePix minimum amount"
                />
                <Input
                  className="h-8 uppercase"
                  maxLength={12}
                  value={livepixCurrency}
                  onChange={(event) => setLivepixCurrency(event.target.value.toUpperCase())}
                  placeholder="BRL"
                  aria-label="LivePix currency"
                />
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Payments below the minimum or without a handle remain pending for manual review.
            </p>
          </div>
          <Button
            className="w-full"
            size="sm"
            loading={captures.busy}
            disabled={temporarilyPaused || !connectionId || (match !== "any" && !matchValue.trim())}
            onClick={() => {
              if (isCapturing && currentRule) {
                void captures.setStatus(currentRule.id, "paused");
                return;
              }
              void captures.save({
                connectionId: connectionId ?? "",
                endsAt: toIso(endsAt),
                entryPolicy,
                excludeBots,
                excludeBroadcaster,
                excludeModerators,
                match,
                matchValue: match === "any" ? null : matchValue.trim(),
                membersOnly,
                startsAt: toIso(startsAt),
                livepix: livepixAutoEntry
                  ? {
                      autoEntry: true,
                      currency: livepixCurrency.trim(),
                      minimumAmountInCents: Math.round(Number(livepixMinimum) * 100),
                    }
                  : null,
              });
            }}
          >
            <Radio />{" "}
            {captureButtonLabel(
              isCapturing,
              participantCount,
              temporarilyPaused && Boolean(currentRule),
            )}
          </Button>
          {import.meta.env.DEV && currentConnection && (
            <ChatSimulationPanel
              channelId={currentConnection.channelId}
              defaultMessage={match === "any" ? "simulated message" : matchValue.trim()}
              enabled={Boolean(isCapturing)}
              onProgress={onRefresh}
              provider={currentConnection.provider}
            />
          )}
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
