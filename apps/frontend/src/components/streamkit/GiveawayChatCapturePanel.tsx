import type { GiveawayCaptureEntryPolicy, GiveawayCaptureMatch } from "@streamkit/contracts";
import { Radio } from "lucide-react";
import { useState } from "react";

import { BaseDateTimePicker } from "@/components/base/BaseDateTimePicker";
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
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Conecte e inicie um provider de chat nas configurações para capturar participantes.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Capturando de{" "}
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
                <SelectItem value="any">Qualquer mensagem</SelectItem>
                <SelectItem value="exact">Mensagem exata</SelectItem>
                <SelectItem value="prefix">Prefixo</SelectItem>
                <SelectItem value="contains">Contém texto</SelectItem>
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
                  <SelectItem value="unique">Uma entrada</SelectItem>
                  <SelectItem value="tickets">Mensagem vira ticket</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-8 items-center rounded-md border border-border px-3 text-xs text-muted-foreground">
                Uma entrada por pessoa
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
              ariaLabel="Início da coleta"
              placeholder="Começar agora"
            />
            <BaseDateTimePicker
              value={endsAt}
              onChange={setEndsAt}
              ariaLabel="Fim da coleta"
              placeholder="Sem término"
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
              defaultMessage={match === "any" ? "mensagem simulada" : matchValue.trim()}
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
  label: string;
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
