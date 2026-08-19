import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Plus, Trash2, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MAX_VISIBLE_PARTICIPANTS } from "@/modules/performance/bounded-render-window";

export type ParticipantPanelItem = {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  livepixAmountInCents?: number | null;
  livepixCurrency?: string | null;
  provider: "kick" | "twitch" | "youtube" | null;
  source: "chat" | "manual" | "livepix";
  ticketCount?: number;
};

function participantInitials(displayName: string) {
  return Array.from(displayName.trim()).slice(0, 2).join("").toUpperCase();
}

export function ParticipantAvatar({
  displayName,
  avatarUrl,
  className = "size-6",
}: {
  displayName: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      className={`flex ${className} shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold`}
    >
      {participantInitials(displayName)}
    </span>
  );
}

function formatContribution(amountInCents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      currency,
      style: "currency",
    }).format(amountInCents / 100);
  } catch {
    return `${currency} ${(amountInCents / 100).toFixed(2)}`;
  }
}

export function ParticipantPanel({
  actions,
  participants,
  expanded,
  onToggle,
  participantName,
  onParticipantNameChange,
  onAddParticipant,
  onRemoveParticipant,
  busy,
  locked,
  onDragStart,
  onDragEnd,
}: {
  actions?: ReactNode;
  participants: ParticipantPanelItem[];
  expanded: boolean;
  onToggle(): void;
  participantName: string;
  onParticipantNameChange(value: string): void;
  onAddParticipant(): void;
  onRemoveParticipant(participantId: string): void;
  busy: boolean;
  locked: boolean;
  onDragStart?(participantId: string): void;
  onDragEnd?(): void;
}) {
  const { t } = useTranslation();
  const visibleParticipants = participants.slice(0, MAX_VISIBLE_PARTICIPANTS);
  const addParticipant = () => {
    if (!participantName.trim()) return;
    onAddParticipant();
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col overflow-x-hidden rounded-3xl border-r border-border p-3 transition-[width] duration-300",
        expanded ? "w-72" : "w-14",
      )}
    >
      <div className={cn("flex gap-2 pb-3", expanded ? "items-center" : "flex-col items-center")}>
        <User className="size-4" />
        {expanded && (
          <>
            <h3 className="flex-1 text-[13px] font-semibold">{t("giveaway.participants")}</h3>
            <span className="text-xs text-muted-foreground">{participants.length}</span>
            {actions}
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={expanded ? t("common.collapse") : t("common.expand")}
          onClick={onToggle}
        >
          {expanded ? <ChevronLeft /> : <ChevronRight />}
        </Button>
      </div>
      {expanded ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex gap-1.5 pb-3">
            <Input
              value={participantName}
              onChange={(event) => onParticipantNameChange(event.target.value)}
              className="h-8 text-xs"
              placeholder={t("giveaway.addParticipant")}
              disabled={busy || locked}
              onKeyDown={(event) => {
                if (event.key === "Enter") addParticipant();
              }}
            />
            <Button
              size="icon-sm"
              disabled={!participantName.trim() || busy || locked}
              onClick={addParticipant}
            >
              <Plus />
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {visibleParticipants.map((participant) => (
              <ParticipantPanelRow
                key={participant.id}
                participant={participant}
                busy={busy}
                locked={locked}
                onRemove={onRemoveParticipant}
                {...(onDragStart ? { onDragStart } : {})}
                {...(onDragEnd ? { onDragEnd } : {})}
              />
            ))}
            {!participants.length && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t("giveaway.addParticipantsDescription")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <TooltipProvider delayDuration={250}>
          <div className="flex min-h-0 w-full flex-col items-center gap-2 overflow-x-hidden overflow-y-auto py-1 pr-2 [scrollbar-gutter:stable]">
            {visibleParticipants.map((participant) => (
              <Tooltip key={participant.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Expand participant ${participant.displayName}`}
                    onClick={onToggle}
                    className="flex size-7 max-w-full shrink-0 items-center justify-center rounded-full border border-border-strong bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ParticipantAvatar
                      displayName={participant.displayName}
                      avatarUrl={participant.avatarUrl}
                      className="size-6"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{participant.displayName}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </aside>
  );
}

function ParticipantPanelRow({
  participant,
  busy,
  locked,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  participant: ParticipantPanelItem;
  busy: boolean;
  locked: boolean;
  onRemove(participantId: string): void;
  onDragStart?(participantId: string): void;
  onDragEnd?(): void;
}) {
  const draggable = Boolean(onDragStart) && !busy && !locked;
  return (
    <div
      draggable={draggable}
      onDragStart={(event) => {
        if (!onDragStart) return;
        event.dataTransfer.setData("text/plain", participant.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart(participant.id);
      }}
      onDragEnd={onDragEnd}
      className="raise flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px]"
    >
      {onDragStart && <GripVertical className="size-3 cursor-grab text-muted-foreground" />}
      <ParticipantAvatar displayName={participant.displayName} avatarUrl={participant.avatarUrl} />
      <span className="min-w-0 flex-1 truncate">{participant.displayName}</span>
      {participant.ticketCount && participant.ticketCount > 1 && (
        <span className="text-[10px] tabular-nums text-muted-foreground">
          ×{participant.ticketCount}
        </span>
      )}
      {participant.source === "livepix" &&
        participant.livepixAmountInCents &&
        participant.livepixCurrency && (
          <span className="whitespace-nowrap text-[10px] font-medium tabular-nums text-foreground">
            {formatContribution(participant.livepixAmountInCents, participant.livepixCurrency)}
          </span>
        )}
      {participant.source === "livepix" && (
        <BaseBrandIcon provider="livepix" className="size-3.5" labelled />
      )}
      {participant.provider && (
        <BaseBrandIcon provider={participant.provider} className="size-3.5" labelled />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        disabled={busy || locked}
        onClick={() => onRemove(participant.id)}
        aria-label={`Delete ${participant.displayName}`}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
