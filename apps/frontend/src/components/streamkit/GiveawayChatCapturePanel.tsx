import type { GiveawayCaptureEntryPolicy, GiveawayCaptureMatch } from "@streamkit/contracts";
import { Pause, Play, Radio, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { BaseConfirmDialog } from "@/components/base/BaseConfirmDialog";
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
import { useGiveawayCaptureRules } from "@/modules/giveaway/use-giveaway-capture-rules";

export function GiveawayChatCapturePanel({
  giveawayId,
  onRefresh,
}: {
  giveawayId: string;
  onRefresh: () => Promise<void>;
}) {
  const captures = useGiveawayCaptureRules(giveawayId, onRefresh);
  const [connectionId, setConnectionId] = useState("");
  const [match, setMatch] = useState<GiveawayCaptureMatch>("exact");
  const [matchValue, setMatchValue] = useState("!participar");
  const [entryPolicy, setEntryPolicy] = useState<GiveawayCaptureEntryPolicy>("unique");
  const [excludeBots, setExcludeBots] = useState(true);
  const [excludeBroadcaster, setExcludeBroadcaster] = useState(true);
  const [excludeModerators, setExcludeModerators] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  useEffect(() => {
    if (!connectionId && captures.connections[0]) setConnectionId(captures.connections[0].id);
  }, [captures.connections, connectionId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!captures.connections.length ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Conecte e inicie um provider de chat nas configurações para capturar participantes.
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={connectionId} onValueChange={setConnectionId}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              {captures.connections.map((connection) => (
                <SelectItem key={connection.id} value={connection.id}>
                  {connection.channelDisplayName} · {connection.provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <Input
              type="datetime-local"
              className="h-8 text-[10px]"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              aria-label="Início da coleta"
            />
            <Input
              type="datetime-local"
              className="h-8 text-[10px]"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              aria-label="Fim da coleta"
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
            disabled={!connectionId || (match !== "any" && !matchValue.trim())}
            onClick={() =>
              void captures.save({
                connectionId,
                endsAt: toIso(endsAt),
                entryPolicy,
                excludeBots,
                excludeBroadcaster,
                excludeModerators,
                match,
                matchValue: match === "any" ? null : matchValue.trim(),
                membersOnly,
                startsAt: toIso(startsAt),
              })
            }
          >
            <Radio /> Iniciar captura
          </Button>
        </div>
      )}

      <div className="mt-3 min-h-0 space-y-2 overflow-y-auto">
        {captures.rules.map((rule) => {
          const connection = captures.connections.find((item) => item.id === rule.connectionId);
          return (
            <div key={rule.id} className="rounded-xl border border-border bg-card p-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${rule.status === "active" ? "bg-success" : "bg-muted-foreground"}`}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {connection?.channelDisplayName ?? "Canal removido"}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={rule.status === "active" ? "Pausar captura" : "Retomar captura"}
                  onClick={() =>
                    void captures.setStatus(rule.id, rule.status === "active" ? "paused" : "active")
                  }
                >
                  {rule.status === "active" ? <Pause /> : <Play />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Excluir regra de captura"
                  onClick={() => setDeletingRuleId(rule.id)}
                >
                  <Trash2 />
                </Button>
              </div>
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                {rule.capturedCount} capturados · {rule.duplicateCount} duplicados ·{" "}
                {rule.rejectedCount} rejeitados
              </p>
            </div>
          );
        })}
      </div>
      {captures.error && <p className="mt-2 text-xs text-destructive">{captures.error}</p>}
      <BaseConfirmDialog
        open={deletingRuleId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingRuleId(null);
        }}
        title="Excluir regra de captura?"
        description="Os participantes já capturados serão preservados. Somente a coleta automática será removida."
        busy={captures.busy}
        onConfirm={async () => {
          if (!deletingRuleId) return;
          await captures.remove(deletingRuleId);
          setDeletingRuleId(null);
        }}
      />
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
