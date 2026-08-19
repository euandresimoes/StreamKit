import { useEffect, useRef, useState } from "react";
import {
  Box,
  ChevronLeft,
  DollarSign,
  Gift,
  ListPlus,
  MessageCircle,
  RotateCw,
  Settings2,
  Trophy,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BaseSegmentedControl } from "@/components/base/BaseSegmentedControl";
import { BaseConfirmDialog } from "@/components/base/BaseConfirmDialog";
import { BaseModal } from "@/components/base/BaseModal";
import { useGiveaways } from "@/modules/giveaway/use-giveaways";
import { useLiveSelection } from "@/modules/live-control/use-live-control";
import { shouldShowGiveawayFocusedChat } from "@/modules/giveaway/giveaway-presentation";
import { CreateItemDialog } from "./CreateItemDialog";
import { EntityHub } from "./EntityHub";
import { GiveawayStage, GIVEAWAY_WHEEL_SPIN_DURATION_MS } from "./GiveawayStage";
import { EntitySettingsDialog } from "./EntitySettingsDialog";
import { FocusedChatPanel } from "./FocusedChatPanel";
import { ParticipantCaptureDialog } from "./ParticipantCaptureDialog";
import { PaymentCaptureDialog } from "./PaymentCaptureDialog";
import { DebugChatSimulationButton } from "./DebugChatSimulationButton";
import { ParticipantPanel } from "./ParticipantPanel";

export function GiveawaysTab() {
  const { t } = useTranslation();
  const giveaways = useGiveaways(false);
  const live = useLiveSelection();
  const [input, setInput] = useState("");
  const [winner, setWinner] = useState<string | null>(null);
  const [targetWinnerId, setTargetWinnerId] = useState<string | null>(null);
  const [drawPhase, setDrawPhase] = useState<"idle" | "drawing" | "revealed">("idle");
  const [creating, setCreating] = useState(false);
  const [newMaxParticipants, setNewMaxParticipants] = useState(1000);
  const [participantName, setParticipantName] = useState("");
  const [participantsExpanded, setParticipantsExpanded] = useState(true);
  const [importing, setImporting] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturingPayment, setCapturingPayment] = useState(false);
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
    setTargetWinnerId(null);
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
    const selectedWinnerId = round.winnerParticipantId;
    setTargetWinnerId(selectedWinnerId);
    setDrawPhase("drawing");
    const revealDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 50
      : detail?.giveaway.mode === "case-opening"
        ? 9000
        : GIVEAWAY_WHEEL_SPIN_DURATION_MS + 250;
    revealTimer.current = setTimeout(() => {
      void (async () => {
        const completed = await giveaways.completeRound(round.id);
        if (!completed) {
          setDrawPhase("idle");
          setTargetWinnerId(null);
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
    setTargetWinnerId(null);
    setDrawPhase("idle");
  };
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      {detail && (
        <header className="flex flex-wrap items-center gap-2 py-3 px-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("giveaway.leave")}
            onClick={() => void giveaways.select("")}
          >
            <ChevronLeft />
          </Button>
          <h2 className="text-lg font-semibold">{detail.giveaway.name}</h2>
          <span
            className="rounded-md bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground"
            aria-label={`${detail.participants.length} of ${detail.giveaway.maxParticipants} ${t("giveaway.participants")}`}
          >
            {detail.participants.length}/{detail.giveaway.maxParticipants}{" "}
            {t("giveaway.participants")}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <BaseSegmentedControl
              ariaLabel={t("giveaway.mode")}
              value={detail.giveaway.mode}
              disabled={!canModify || giveaways.busy || drawPhase === "drawing"}
              options={[
                {
                  value: "wheel",
                  label: t("giveaway.wheel"),
                  icon: <RotateCw className="size-3.5" />,
                },
                {
                  value: "case-opening",
                  label: t("giveaway.box"),
                  icon: <Box className="size-3.5" />,
                },
              ]}
              onChange={(mode) => {
                clearCompletedPresentation();
                void giveaways.updateMode(mode);
              }}
            />
            <Button size="sm" variant="secondary" onClick={() => setCapturing(true)}>
              <MessageCircle /> {t("giveaway.captureChat")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCapturingPayment(true)}>
              <DollarSign /> {t("giveaway.capturePayment")}
            </Button>
            <DebugChatSimulationButton
              target="giveaway"
              targetId={detail.giveaway.id}
              onProgress={async () => {
                await giveaways.refresh();
              }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("giveaway.configure")}
              onClick={() => setConfiguring(true)}
            >
              <Settings2 />
            </Button>
          </div>
        </header>
      )}

      {!detail ? (
        <EntityHub
          items={giveaways.items}
          icon={Gift}
          label={t("giveaway.label")}
          searchPlaceholder={t("giveaway.search")}
          createLabel={t("giveaway.newTitle")}
          emptyLabel={t("giveaway.empty")}
          firstLabel={t("common.createFirst")}
          onCreate={() => setCreating(true)}
          onSelect={(id) => void giveaways.select(id)}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          <ParticipantPanel
            actions={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("giveaway.importParticipants")}
                disabled={!canModify || giveaways.busy || drawPhase === "drawing"}
                onClick={() => setImporting(true)}
              >
                <ListPlus />
              </Button>
            }
            participants={detail.participants}
            expanded={participantsExpanded}
            onToggle={() => setParticipantsExpanded((value) => !value)}
            participantName={participantName}
            onParticipantNameChange={setParticipantName}
            onAddParticipant={() => {
              if (!participantName.trim()) return;
              clearCompletedPresentation();
              const saved = giveaways.importParticipants(
                participantName.trim(),
                live.selected?.provider ?? null,
                live.selected?.channelId ?? null,
              );
              if (saved)
                void saved.then((result) => {
                  if (result) setParticipantName("");
                });
            }}
            onRemoveParticipant={(participantId) => {
              const participant = detail.participants.find((item) => item.id === participantId);
              if (!participant) return;
              setRemovingParticipant({ id: participant.id, name: participant.displayName });
            }}
            busy={giveaways.busy}
            locked={!canModify || drawPhase === "drawing"}
          />

          <section className="min-h-[430px] min-w-0 flex-1 rounded-3xl p-3 text-center">
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
              targetWinnerId={targetWinnerId}
            />
          </section>

          <aside className="flex min-h-0 w-[280px] shrink-0 flex-col rounded-3xl border-l border-border p-4">
            <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-border bg-card/60 p-4 text-center">
              <Trophy
                className={
                  winner ? "mb-3 size-6 text-yellow-400" : "mb-3 size-6 text-muted-foreground"
                }
              />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("giveaway.winner")}
              </p>
              <p aria-live="polite" className="mt-2 break-words text-lg font-semibold">
                {drawPhase === "drawing"
                  ? t("giveaway.drawing")
                  : (winner ?? t("giveaway.waitingForDraw"))}
              </p>
            </div>
            {giveaways.history.length > 0 && (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto text-left">
                <p className="pb-2 text-xs font-semibold text-muted-foreground">
                  {t("giveaway.winnerHistory")}
                </p>
                {giveaways.history
                  .slice(drawPhase === "drawing" ? 1 : 0, drawPhase === "drawing" ? 6 : 5)
                  .map((round) => {
                    const entry = round.entries.find(
                      (item) => item.participantId === round.winnerParticipantId,
                    );
                    return (
                      <p key={round.id} className="border-t border-border py-2 text-xs">
                        {entry?.displayName ?? t("giveaway.participant")} ·{" "}
                        {new Date(round.startedAt).toLocaleString("en-US")}
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
        title={t("giveaway.newTitle")}
        description={t("giveaway.prizeDescription")}
        placeholder={t("giveaway.prizePlaceholder")}
        label={t("giveaway.create")}
        busy={giveaways.busy}
        submitDisabled={newMaxParticipants < 1 || newMaxParticipants > 10000}
        onSubmit={createGiveaway}
      >
        <label className="space-y-1.5 text-xs font-medium">
          <span>{t("giveaway.maxParticipants")}</span>
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
        <BaseModal
          open={importing}
          onOpenChange={setImporting}
          title={t("giveaway.importTitle")}
          description={t("giveaway.importDescription")}
        >
          <Textarea
            value={input}
            disabled={!canModify || giveaways.busy || drawPhase === "drawing"}
            onChange={(event) => setInput(event.target.value)}
            placeholder={"Maria\nJohn\nAna"}
            className="min-h-56 resize-none text-[13px]"
          />
          <div className="mt-4 flex justify-end">
            <Button
              disabled={!input.trim() || giveaways.busy || !canModify || drawPhase === "drawing"}
              onClick={async () => {
                if (!input.trim()) return;
                clearCompletedPresentation();
                const saved = await giveaways.importParticipants(
                  input,
                  live.selected?.provider ?? null,
                  live.selected?.channelId ?? null,
                );
                if (saved) {
                  setInput("");
                  setImporting(false);
                }
              }}
            >
              <Users /> {t("giveaway.importTitle")}
            </Button>
          </div>
        </BaseModal>
      )}
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
        <PaymentCaptureDialog
          open={capturingPayment}
          onOpenChange={setCapturingPayment}
          target="giveaway"
          targetId={detail.giveaway.id}
          onRefresh={giveaways.refresh}
        />
      )}
      {detail && (
        <EntitySettingsDialog
          open={configuring}
          onOpenChange={setConfiguring}
          busy={giveaways.busy}
          entityLabel="giveaway"
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
        title={t("giveaway.removeParticipantTitle")}
        description={t("giveaway.removeDescription", { name: removingParticipant?.name ?? "" })}
        onConfirm={async () => {
          if (!removingParticipant) return;
          clearCompletedPresentation();
          await giveaways.removeParticipant(removingParticipant.id);
          setRemovingParticipant(null);
        }}
      />
      {detail && (
        <FocusedChatPanel
          key={detail.activeRound?.id}
          target="giveaways"
          targetId={detail.giveaway.id}
          visible={shouldShowGiveawayFocusedChat(
            drawPhase,
            winner,
            detail.activeRound?.completedAt,
          )}
        />
      )}
    </div>
  );
}
