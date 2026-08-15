import { useEffect, useRef, useState } from "react";
import {
  Box,
  DoorOpen,
  Gift,
  ListPlus,
  MessageCircle,
  RotateCw,
  Search,
  Settings2,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BaseSegmentedControl } from "@/components/base/BaseSegmentedControl";
import { BaseConfirmDialog } from "@/components/base/BaseConfirmDialog";
import { useGiveaways } from "@/modules/giveaway/use-giveaways";
import { useLiveSelection } from "@/modules/live-control/use-live-control";
import { shouldShowGiveawayFocusedChat } from "@/modules/giveaway/giveaway-presentation";
import { CreateItemDialog } from "./CreateItemDialog";
import { EntityHub } from "./EntityHub";
import { GiveawayStage } from "./GiveawayStage";
import { EntitySettingsDialog } from "./EntitySettingsDialog";
import { FocusedChatPanel } from "./FocusedChatPanel";
import { ParticipantCaptureDialog } from "./ParticipantCaptureDialog";
import { MAX_VISIBLE_PARTICIPANTS } from "@/modules/performance/bounded-render-window";

export function GiveawaysTab() {
  const giveaways = useGiveaways(false);
  const live = useLiveSelection();
  const [input, setInput] = useState("");
  const [winner, setWinner] = useState<string | null>(null);
  const [targetWinner, setTargetWinner] = useState<string | null>(null);
  const [drawPhase, setDrawPhase] = useState<"idle" | "drawing" | "revealed">("idle");
  const [creating, setCreating] = useState(false);
  const [newMaxParticipants, setNewMaxParticipants] = useState(1000);
  const [participantQuery, setParticipantQuery] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [capturing, setCapturing] = useState(false);
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
      maxParticipants: newMaxParticipants,
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
      void (async () => {
        const completed = await giveaways.completeRound(round.id);
        if (!completed) {
          setDrawPhase("idle");
          setTargetWinner(null);
          return;
        }
        setWinner(selectedWinner);
        setDrawPhase("revealed");
      })();
    }, revealDelay);
  };

  const clearCompletedPresentation = () => {
    if (detail?.giveaway.status !== "completed") return;
    setWinner(null);
    setTargetWinner(null);
    setDrawPhase("idle");
  };
  const filteredParticipants =
    detail?.participants.filter((participant) =>
      participant.displayName
        .toLocaleLowerCase("pt-BR")
        .includes(participantQuery.trim().toLocaleLowerCase("pt-BR")),
    ) ?? [];
  const visibleParticipants = filteredParticipants.slice(0, MAX_VISIBLE_PARTICIPANTS);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto px-2 pb-2">
      {detail && (
        <header className="flex flex-wrap items-center gap-2 py-3 px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sair do sorteio"
            onClick={() => void giveaways.select("")}
          >
            <DoorOpen />
          </Button>
          <h2 className="text-lg font-semibold">{detail.giveaway.name}</h2>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setCapturing(true)}>
              <MessageCircle /> Capturar do chat
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Configurar sorteio"
              onClick={() => setConfiguring(true)}
            >
              <Settings2 />
            </Button>
          </div>
        </header>
      )}

      {giveaways.error && (
        <p className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {giveaways.error}
        </p>
      )}

      {!detail ? (
        <EntityHub
          items={giveaways.items}
          icon={Gift}
          label="Sorteio"
          onCreate={() => setCreating(true)}
          onSelect={(id) => void giveaways.select(id)}
        />
      ) : (
        <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-[300px_minmax(400px,1fr)_280px]">
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
            <div className="flex items-center gap-2 pb-3">
              <ListPlus className="size-4" />
              <h3 className="flex-1 text-[13px] font-semibold">Importar participantes</h3>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">
                {detail.giveaway.status === "completed" ? "Concluído" : "Pronto"}
              </span>
            </div>
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
                disabled={!input.trim() || giveaways.busy || !canModify || drawPhase === "drawing"}
                onClick={async () => {
                  if (!input.trim()) return;
                  clearCompletedPresentation();
                  const saved = await giveaways.importParticipants(
                    input,
                    live.selected?.provider ?? null,
                    live.selected?.channelId ?? null,
                  );
                  if (saved) setInput("");
                }}
              >
                <Users /> Salvar participantes
              </Button>
            </>
            <div className="mt-4 min-h-0 rounded-2xl border border-border bg-card/45 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-8 text-xs"
                  value={participantQuery}
                  onChange={(event) => setParticipantQuery(event.target.value)}
                  placeholder="Buscar participante"
                  aria-label="Buscar participante"
                />
              </div>
              <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {visibleParticipants.map((participant) => (
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
                        setRemovingParticipant({
                          id: participant.id,
                          name: participant.displayName,
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {!filteredParticipants.length && (
                  <p className="px-2 py-5 text-center text-xs text-muted-foreground">
                    {participantQuery ? "Nenhum participante encontrado." : "Nenhum participante."}
                  </p>
                )}
                {filteredParticipants.length > MAX_VISIBLE_PARTICIPANTS && (
                  <p className="px-2 pt-2 text-center text-[10px] text-muted-foreground">
                    Exibindo {MAX_VISIBLE_PARTICIPANTS} de {filteredParticipants.length}. Refine a
                    busca para ver outros participantes.
                  </p>
                )}
              </div>
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
        submitDisabled={newMaxParticipants < 1 || newMaxParticipants > 10000}
        onSubmit={createGiveaway}
      >
        <label className="space-y-1.5 text-xs font-medium">
          <span>Máximo de participantes</span>
          <Input
            type="number"
            min={1}
            max={10000}
            value={newMaxParticipants}
            onChange={(event) => setNewMaxParticipants(Number(event.target.value))}
          />
        </label>
      </CreateItemDialog>
      {detail && (
        <ParticipantCaptureDialog
          open={capturing}
          onOpenChange={setCapturing}
          target="giveaway"
          targetId={detail.giveaway.id}
          participantCount={detail.participants.length}
          temporarilyPaused={drawPhase === "drawing"}
          onRefresh={giveaways.refresh}
        />
      )}
      {detail && (
        <EntitySettingsDialog
          open={configuring}
          onOpenChange={setConfiguring}
          busy={giveaways.busy}
          entityLabel="sorteio"
          name={detail.giveaway.name}
          maxParticipants={detail.giveaway.maxParticipants}
          onSave={({ name, maxParticipants }) =>
            giveaways.update(name, detail.giveaway.mode, maxParticipants)
          }
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
      {detail &&
        shouldShowGiveawayFocusedChat(drawPhase, winner, detail.activeRound?.completedAt) && (
          <FocusedChatPanel
            key={detail.activeRound?.id}
            target="giveaways"
            targetId={detail.giveaway.id}
          />
        )}
    </div>
  );
}
