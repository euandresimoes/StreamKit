import { useEffect, useRef, useState } from "react";
import {
  Box,
  Gift,
  ListPlus,
  MessageCircle,
  Plus,
  Radio,
  RotateCw,
  Settings2,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BaseSegmentedControl } from "@/components/base/BaseSegmentedControl";
import { BaseConfirmDialog } from "@/components/base/BaseConfirmDialog";
import { useGiveaways } from "@/modules/giveaway/use-giveaways";
import { CreateItemDialog } from "./CreateItemDialog";
import { EntitySelect } from "./EntitySelect";
import { GiveawayStage } from "./GiveawayStage";
import { EntitySettingsDialog } from "./EntitySettingsDialog";
import { ParticipantChatCapturePanel } from "./GiveawayChatCapturePanel";
import { FocusedChatPanel } from "./FocusedChatPanel";

export function GiveawaysTab() {
  const giveaways = useGiveaways();
  const [input, setInput] = useState("");
  const [winner, setWinner] = useState<string | null>(null);
  const [targetWinner, setTargetWinner] = useState<string | null>(null);
  const [drawPhase, setDrawPhase] = useState<"idle" | "drawing" | "revealed">("idle");
  const [creating, setCreating] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [participantSource, setParticipantSource] = useState<"chat" | "manual">("manual");
  const [removingParticipant, setRemovingParticipant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detail = giveaways.detail;
  const canModify = detail ? detail.giveaway.status !== "drawing" : false;

  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  useEffect(() => {
    setWinner(null);
    setTargetWinner(null);
    setDrawPhase("idle");
  }, [detail?.giveaway.id]);

  const createGiveaway = async (name: string) => {
    await giveaways.create({
      name,
      mode: "wheel",
      duplicatePolicy: "remove",
    });
  };

  const draw = async () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setWinner(null);
    const round = await giveaways.draw();
    if (!round) return;
    const entry = round.entries.find((item) => item.participantId === round.winnerParticipantId);
    const selectedWinner = entry?.displayName ?? null;
    setTargetWinner(selectedWinner);
    setDrawPhase("drawing");
    const revealDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 50
      : detail?.giveaway.mode === "case-opening"
        ? 9000
        : 6500;
    revealTimer.current = setTimeout(() => {
      setWinner(selectedWinner);
      setDrawPhase("revealed");
    }, revealDelay);
  };

  const clearCompletedPresentation = () => {
    if (detail?.giveaway.status !== "completed") return;
    setWinner(null);
    setTargetWinner(null);
    setDrawPhase("idle");
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto px-6 pb-6">
      <header className="flex flex-wrap items-center gap-3 py-5">
        <div>
          <h2 className="text-lg font-semibold">{detail?.giveaway.name ?? "Sorteios"}</h2>
        </div>
        <div className="ml-auto">
          <EntitySelect
            items={giveaways.items}
            label="Selecionar sorteio"
            value={detail?.giveaway.id}
            onChange={(id) => void giveaways.select(id)}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
          <Plus /> Novo sorteio
        </Button>
        {detail && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Configurar sorteio"
            onClick={() => setConfiguring(true)}
          >
            <Settings2 />
          </Button>
        )}
      </header>

      {giveaways.error && (
        <p className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {giveaways.error}
        </p>
      )}

      {!detail ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <Gift className="size-9" />
          <p className="text-sm">Crie seu primeiro sorteio manual.</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(400px,1fr)_280px]">
          <aside className="glass flex flex-col rounded-3xl p-4">
            <div className="mb-3">
              <BaseSegmentedControl
                ariaLabel="Tipo de sorteio"
                value={detail.giveaway.mode}
                disabled={!canModify || giveaways.busy || drawPhase === "drawing"}
                options={[
                  { value: "wheel", label: "Roleta", icon: <RotateCw className="size-3.5" /> },
                  { value: "case-opening", label: "Caixa", icon: <Box className="size-3.5" /> },
                ]}
                onChange={(mode) => {
                  clearCompletedPresentation();
                  void giveaways.updateMode(mode);
                }}
              />
            </div>
            <div className="mb-3">
              <BaseSegmentedControl
                ariaLabel="Fonte dos participantes"
                value={participantSource}
                options={[
                  { value: "manual", label: "Manual", icon: <ListPlus className="size-3.5" /> },
                  { value: "chat", label: "Chat", icon: <MessageCircle className="size-3.5" /> },
                ]}
                onChange={(source) => {
                  if (source === "manual" || source === "chat") setParticipantSource(source);
                }}
              />
            </div>
            <div className="flex items-center gap-2 pb-3">
              {participantSource === "manual" ? (
                <ListPlus className="size-4" />
              ) : (
                <Radio className="size-4" />
              )}
              <h3 className="flex-1 text-[13px] font-semibold">
                {participantSource === "manual" ? "Importar participantes" : "Capturar do chat"}
              </h3>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">
                {detail.giveaway.status === "completed" ? "Concluído" : "Pronto"}
              </span>
            </div>
            {participantSource === "manual" ? (
              <>
                <Textarea
                  value={input}
                  disabled={!canModify || giveaways.busy || drawPhase === "drawing"}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={"Um nome por linha\nMaria\nJoão\nAna"}
                  className="min-h-40 flex-1 resize-none text-[13px]"
                />
                <Button
                  className="mt-3"
                  disabled={
                    !input.trim() || giveaways.busy || !canModify || drawPhase === "drawing"
                  }
                  onClick={async () => {
                    if (!input.trim()) return;
                    clearCompletedPresentation();
                    const saved = await giveaways.importParticipants(input);
                    if (saved) setInput("");
                  }}
                >
                  <Users /> Salvar participantes
                </Button>
              </>
            ) : (
              <ParticipantChatCapturePanel
                target="giveaway"
                targetId={detail.giveaway.id}
                onRefresh={giveaways.refresh}
              />
            )}
            <div className="mt-4 space-y-1.5 overflow-y-auto">
              {detail.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center rounded-xl border border-border bg-card py-1.5 pl-3 pr-1.5 text-[13px]"
                >
                  <span className="min-w-0 flex-1 truncate">{participant.displayName}</span>
                  <span className="text-muted-foreground">×{participant.ticketCount}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${participant.displayName}`}
                    disabled={!canModify || giveaways.busy || drawPhase === "drawing"}
                    onClick={() =>
                      setRemovingParticipant({ id: participant.id, name: participant.displayName })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </aside>

          <section className="glass-panel min-h-[430px] rounded-3xl p-3 text-center">
            <GiveawayStage
              disabled={
                giveaways.busy ||
                !detail.participants.length ||
                !canModify ||
                drawPhase === "drawing"
              }
              mode={detail.giveaway.mode}
              onDraw={() => void draw()}
              participants={detail.participants}
              phase={drawPhase}
              winner={winner}
              targetWinner={targetWinner}
            />
          </section>

          <aside className="glass flex min-h-0 flex-col rounded-3xl p-4">
            <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-border bg-card/60 p-4 text-center">
              <Trophy
                className={
                  winner ? "mb-3 size-6 text-primary" : "mb-3 size-6 text-muted-foreground"
                }
              />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Vencedor
              </p>
              <p aria-live="polite" className="mt-2 break-words text-lg font-semibold">
                {drawPhase === "drawing" ? "Sorteando…" : (winner ?? "Aguardando sorteio")}
              </p>
            </div>
            {giveaways.history.length > 0 && (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto text-left">
                <p className="pb-2 text-xs font-semibold text-muted-foreground">
                  Histórico de vencedores
                </p>
                {giveaways.history
                  .slice(drawPhase === "drawing" ? 1 : 0, drawPhase === "drawing" ? 6 : 5)
                  .map((round) => {
                    const entry = round.entries.find(
                      (item) => item.participantId === round.winnerParticipantId,
                    );
                    return (
                      <p key={round.id} className="border-t border-border py-2 text-xs">
                        {entry?.displayName ?? "Participante"} ·{" "}
                        {new Date(round.startedAt).toLocaleString("pt-BR")}
                      </p>
                    );
                  })}
              </div>
            )}
          </aside>
        </div>
      )}
      <CreateItemDialog
        open={creating}
        onOpenChange={setCreating}
        title="Novo sorteio"
        description="Defina um nome ou o prêmio que será sorteado."
        placeholder="Ex.: Gift card de R$ 100"
        label="Criar sorteio"
        busy={giveaways.busy}
        onSubmit={createGiveaway}
      />
      {detail && (
        <EntitySettingsDialog
          open={configuring}
          onOpenChange={setConfiguring}
          busy={giveaways.busy}
          entityLabel="sorteio"
          name={detail.giveaway.name}
          onSave={({ name }) => giveaways.update(name, detail.giveaway.mode)}
          onDelete={() => giveaways.delete()}
        />
      )}
      <BaseConfirmDialog
        open={removingParticipant !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingParticipant(null);
        }}
        busy={giveaways.busy}
        title="Remover participante?"
        description={`“${removingParticipant?.name ?? ""}” será removido das próximas rodadas. O histórico existente será preservado.`}
        onConfirm={async () => {
          if (!removingParticipant) return;
          clearCompletedPresentation();
          await giveaways.removeParticipant(removingParticipant.id);
          setRemovingParticipant(null);
        }}
      />
      {detail?.giveaway.status === "completed" && detail.activeRound?.completedAt && (
        <FocusedChatPanel target="giveaways" targetId={detail.giveaway.id} />
      )}
    </div>
  );
}
