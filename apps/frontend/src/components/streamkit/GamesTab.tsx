import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MessageCircle,
  Minus,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  Trophy,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BaseConfirmDialog } from "@/components/base/BaseConfirmDialog";
import { BaseColorPicker } from "@/components/base/BaseColorPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTournaments } from "@/modules/tournament/use-tournaments";
import { cn } from "@/lib/utils";
import { CreateItemDialog } from "./CreateItemDialog";
import { EntitySelect } from "./EntitySelect";
import { EntitySettingsDialog } from "./EntitySettingsDialog";
import { ParticipantChatCapturePanel } from "./GiveawayChatCapturePanel";
import { FocusedChatPanel } from "./FocusedChatPanel";

function getParticipantInitials(displayName: string) {
  return Array.from(displayName.trim()).slice(0, 2).join("").toUpperCase();
}

export function GamesTab() {
  const tournaments = useTournaments();
  const [name, setName] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [creating, setCreating] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [draggedParticipantId, setDraggedParticipantId] = useState<string | null>(null);
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [deletingTeam, setDeletingTeam] = useState<{ id: string; name: string } | null>(null);
  const [participantsExpanded, setParticipantsExpanded] = useState(true);
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  const detail = tournaments.detail;
  const entrantCount = detail
    ? detail.tournament.mode === "team"
      ? detail.teams.length
      : detail.participants.length
    : 0;
  const slotsFilled = entrantCount === detail?.tournament.bracketSize;
  const canChangeStructure = detail ? !detail.matches.length : false;

  const createTournament = async (tournamentName: string, option?: string) => {
    const mode = option === "team" ? "team" : "individual";
    await tournaments.create({
      name: tournamentName,
      description: null,
      mode,
      bracketSize: 8,
      teamCapacity: mode === "team" ? 3 : null,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold">{detail?.tournament.name ?? "Torneios"}</h2>
        </div>
        <div className="ml-auto">
          <EntitySelect
            items={tournaments.items}
            label="Selecionar torneio"
            value={detail?.tournament.id}
            onChange={(id) => void tournaments.select(id)}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
          <Plus /> Novo torneio
        </Button>
        {detail && (
          <Button variant="secondary" size="sm" onClick={() => setCapturing(true)}>
            <MessageCircle /> Capturar do chat
          </Button>
        )}
        {detail && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Configurar torneio"
            onClick={() => setConfiguring(true)}
          >
            <Settings2 />
          </Button>
        )}
        {detail && (
          <>
            <Select
              value={String(detail.tournament.bracketSize)}
              disabled={tournaments.busy || !canChangeStructure}
              onValueChange={(value) =>
                void tournaments.updateStructure(
                  detail.tournament.mode,
                  Number(value) as 4 | 8 | 16 | 32,
                )
              }
            >
              <SelectTrigger className="h-8 w-36" aria-label="Quantidade de participantes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[4, 8, 16, 32].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} participantes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              loading={tournaments.busy}
              disabled={tournaments.busy || !slotsFilled || detail.matches.length > 0}
              onClick={() => void tournaments.shuffle()}
            >
              <Sparkles /> Sortear chaves
            </Button>
            <Button
              size="sm"
              disabled={tournaments.busy || (!detail.matches.length && !slotsFilled)}
              onClick={() => void tournaments.start()}
            >
              <Trophy /> Iniciar torneio
            </Button>
          </>
        )}
      </header>

      {tournaments.error && (
        <p className="mx-6 mb-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {tournaments.error}
        </p>
      )}

      {!detail ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <Trophy className="size-9" />
          <p className="text-sm">Nenhum torneio cadastrado.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4 px-6 pb-6">
          {detail.tournament.mode === "team" &&
            (() => {
              const assignedIds = new Set(detail.teamMembers.map((member) => member.participantId));
              const queued = detail.participants.filter(
                (participant) => !assignedIds.has(participant.id),
              );
              return (
                <aside
                  className={cn(
                    "glass flex shrink-0 flex-col overflow-x-hidden rounded-3xl p-3 transition-[width] duration-300",
                    participantsExpanded ? "w-60" : "w-14",
                  )}
                >
                  <div
                    className={cn(
                      "flex gap-2 pb-3",
                      participantsExpanded ? "items-center" : "flex-col items-center",
                    )}
                  >
                    <User className="size-4" />
                    {participantsExpanded && (
                      <>
                        <h3 className="flex-1 text-[13px] font-semibold">Participantes</h3>
                        <span className="text-xs text-muted-foreground">{queued.length}</span>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={
                        participantsExpanded ? "Recolher participantes" : "Expandir participantes"
                      }
                      onClick={() => setParticipantsExpanded((value) => !value)}
                    >
                      {participantsExpanded ? <ChevronLeft /> : <ChevronRight />}
                    </Button>
                  </div>
                  {participantsExpanded && (
                    <>
                      <div className="flex gap-1.5 pb-3">
                        <Input
                          value={participantName}
                          onChange={(event) => setParticipantName(event.target.value)}
                          className="h-8 text-xs"
                          placeholder="Adicionar participante"
                          disabled={tournaments.busy || detail.matches.length > 0}
                        />
                        <Button
                          size="icon-sm"
                          disabled={!participantName.trim() || tournaments.busy}
                          onClick={() => {
                            if (!participantName.trim()) return;
                            void tournaments.addParticipant(participantName.trim());
                            setParticipantName("");
                          }}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <div className="space-y-1.5 overflow-y-auto">
                        {queued.map((participant) => (
                          <div
                            key={participant.id}
                            draggable={!tournaments.busy}
                            onDragStart={() => setDraggedParticipantId(participant.id)}
                            onDragEnd={() => setDraggedParticipantId(null)}
                            className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-2"
                          >
                            <GripVertical className="size-3 cursor-grab text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-xs">
                              {participant.displayName}
                            </span>
                            {participant.source === "chat" && (
                              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                                {participant.provider}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => void tournaments.removeParticipant(participant.id)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {!queued.length && (
                        <p className="mt-4 text-center text-xs text-muted-foreground">
                          Adicione participantes manualmente ou capture entradas do chat.
                        </p>
                      )}
                    </>
                  )}
                  {!participantsExpanded && (
                    <TooltipProvider delayDuration={250}>
                      <div className="flex min-h-0 w-full flex-col items-center gap-2 overflow-x-hidden overflow-y-auto py-1">
                        {queued.map((participant) => (
                          <Tooltip key={participant.id}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Expandir participante ${participant.displayName}`}
                                onClick={() => setParticipantsExpanded(true)}
                                className="flex size-7 max-w-full shrink-0 items-center justify-center rounded-full border border-border-strong bg-card text-[9px] font-semibold uppercase transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {getParticipantInitials(participant.displayName)}
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
            })()}
          <aside
            className={cn(
              "glass flex shrink-0 flex-col overflow-x-hidden rounded-3xl p-3 transition-[width] duration-300",
              teamsExpanded ? (detail.tournament.mode === "team" ? "w-[380px]" : "w-72") : "w-14",
            )}
          >
            <div
              className={cn(
                "flex gap-2 pb-3",
                teamsExpanded ? "items-center" : "flex-col items-center",
              )}
            >
              {detail.tournament.mode === "team" ? (
                <Users className="size-4" />
              ) : (
                <User className="size-4" />
              )}
              {teamsExpanded && (
                <>
                  <h3 className="flex-1 text-[13px] font-semibold">
                    {detail.tournament.mode === "team" ? "Equipes" : "Participantes"}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {entrantCount}/{detail.tournament.bracketSize}
                  </span>
                </>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={teamsExpanded ? "Recolher painel" : "Expandir painel"}
                onClick={() => setTeamsExpanded((value) => !value)}
              >
                {teamsExpanded ? <ChevronLeft /> : <ChevronRight />}
              </Button>
            </div>
            {teamsExpanded && (
              <>
                <div className="flex gap-1.5 pb-3">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={
                      detail.tournament.mode === "team" ? "Adicionar equipe…" : "Adicionar nome…"
                    }
                    disabled={tournaments.busy || detail.matches.length > 0}
                    className="h-8 text-[13px]"
                  />
                  <Button
                    size="icon-sm"
                    disabled={tournaments.busy || detail.matches.length > 0 || !name.trim()}
                    onClick={() => {
                      if (name.trim()) {
                        void (detail.tournament.mode === "team"
                          ? tournaments.addTeam(name.trim())
                          : tournaments.addParticipant(name.trim()));
                        setName("");
                      }
                    }}
                  >
                    <Plus />
                  </Button>
                </div>
                {detail.tournament.mode === "team" && detail.teams.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mb-3"
                    disabled={tournaments.busy || detail.matches.length > 0}
                    onClick={() => void tournaments.shuffleTeamMembers()}
                  >
                    <Sparkles /> Sortear participantes
                  </Button>
                )}
                <div className="space-y-2 overflow-y-auto">
                  {detail.tournament.mode === "team"
                    ? detail.teams.map((team) => {
                        const members = detail.teamMembers.filter(
                          (member) => member.teamId === team.id,
                        );
                        const draftName = teamNames[team.id] ?? team.name;
                        return (
                          <div
                            key={team.id}
                            className="rounded-2xl border border-border-strong bg-card p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={`Escolher cor de ${team.name}`}
                                    disabled={tournaments.busy || detail.matches.length > 0}
                                    className="size-7 shrink-0 rounded-full border-2 border-border-strong outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                    style={{ backgroundColor: team.color }}
                                  />
                                </PopoverTrigger>
                                <PopoverContent
                                  align="start"
                                  className="w-auto border-0 bg-transparent p-0 shadow-none"
                                >
                                  <BaseColorPicker
                                    value={team.color}
                                    onChange={(color) =>
                                      void tournaments.updateTeam(
                                        team.id,
                                        draftName,
                                        team.capacity,
                                        color,
                                      )
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                              <Input
                                value={draftName}
                                disabled={tournaments.busy || detail.matches.length > 0}
                                className="h-8 font-semibold"
                                onChange={(event) =>
                                  setTeamNames((current) => ({
                                    ...current,
                                    [team.id]: event.target.value,
                                  }))
                                }
                                onBlur={() => {
                                  if (draftName.trim() && draftName.trim() !== team.name)
                                    void tournaments.updateTeam(
                                      team.id,
                                      draftName.trim(),
                                      team.capacity,
                                      team.color,
                                    );
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Excluir ${team.name}`}
                                disabled={tournaments.busy || detail.matches.length > 0}
                                onClick={() => setDeletingTeam({ id: team.id, name: team.name })}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex-1">
                                {members.length}/{team.capacity} slots
                              </span>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={
                                  team.capacity <= 1 ||
                                  members.some((member) => member.slotPosition === team.capacity)
                                }
                                onClick={() =>
                                  void tournaments.updateTeam(
                                    team.id,
                                    draftName,
                                    team.capacity - 1,
                                    team.color,
                                  )
                                }
                              >
                                <Minus />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={team.capacity >= 16}
                                onClick={() =>
                                  void tournaments.updateTeam(
                                    team.id,
                                    draftName,
                                    team.capacity + 1,
                                    team.color,
                                  )
                                }
                              >
                                <Plus />
                              </Button>
                            </div>
                            <div className="mt-2 space-y-1.5">
                              {Array.from({ length: team.capacity }, (_, index) => {
                                const slot = index + 1;
                                const member = members.find((item) => item.slotPosition === slot);
                                return (
                                  <div
                                    key={slot}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => {
                                      if (draggedMemberId)
                                        void tournaments.moveTeamMember(
                                          draggedMemberId,
                                          team.id,
                                          slot,
                                        );
                                      else if (draggedParticipantId)
                                        void tournaments.assignParticipant(
                                          team.id,
                                          draggedParticipantId,
                                          slot,
                                        );
                                      setDraggedMemberId(null);
                                      setDraggedParticipantId(null);
                                    }}
                                    className="flex min-h-9 items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-2"
                                  >
                                    <span className="w-4 text-[10px] text-muted-foreground">
                                      {slot}
                                    </span>
                                    {member ? (
                                      <>
                                        <GripVertical className="size-3 cursor-grab text-muted-foreground" />
                                        <span
                                          draggable
                                          onDragStart={() => setDraggedMemberId(member.id)}
                                          className="min-w-0 flex-1 truncate text-xs"
                                        >
                                          {member.displayName}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() =>
                                            void tournaments.removeTeamMember(member.id)
                                          }
                                        >
                                          <Trash2 />
                                        </Button>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Slot vazio
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    : detail.participants.map((participant) => (
                        <div
                          key={participant.id}
                          draggable={!tournaments.busy && !detail.matches.length}
                          onDragStart={() => setDraggedParticipantId(participant.id)}
                          onDragEnd={() => setDraggedParticipantId(null)}
                          className="raise flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px]"
                        >
                          <span className="flex size-6 items-center justify-center rounded-lg bg-surface-2 text-[10px] font-semibold">
                            {participant.displayName.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate">{participant.displayName}</span>
                          {participant.source === "chat" && (
                            <span className="ml-auto text-[9px] uppercase text-muted-foreground">
                              {participant.provider}
                            </span>
                          )}
                        </div>
                      ))}
                </div>
              </>
            )}
            {!teamsExpanded && (
              <TooltipProvider delayDuration={250}>
                <div className="flex min-h-0 w-full flex-col items-center gap-2 overflow-x-hidden overflow-y-auto py-1">
                  {detail.tournament.mode === "team"
                    ? detail.teams.map((team) => {
                        const members = detail.teamMembers.filter(
                          (member) => member.teamId === team.id,
                        );
                        return (
                          <Tooltip key={team.id}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Expandir equipe ${team.name}`}
                                onClick={() => setTeamsExpanded(true)}
                                className="size-7 max-w-full shrink-0 rounded-full border-2 border-border-strong outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
                                style={{ backgroundColor: team.color }}
                              />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="w-56 rounded-xl border border-border-strong bg-popover p-3 text-popover-foreground shadow-xl"
                            >
                              <p className="mb-2 truncate text-xs font-semibold">{team.name}</p>
                              <div className="flex flex-col gap-1.5">
                                {members.map((member) => (
                                  <div key={member.id} className="flex min-w-0 items-center gap-2">
                                    <User className="size-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-xs">{member.displayName}</span>
                                  </div>
                                ))}
                                {!members.length && (
                                  <span className="text-xs text-muted-foreground">
                                    Nenhum participante
                                  </span>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })
                    : detail.participants.map((participant) => (
                        <Tooltip key={participant.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Expandir participante ${participant.displayName}`}
                              onClick={() => setTeamsExpanded(true)}
                              className="flex size-7 max-w-full shrink-0 items-center justify-center rounded-full border border-border-strong bg-card text-[9px] font-semibold uppercase transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {getParticipantInitials(participant.displayName)}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">{participant.displayName}</TooltipContent>
                        </Tooltip>
                      ))}
                </div>
              </TooltipProvider>
            )}
          </aside>

          <div className="glass-panel min-w-0 flex-1 overflow-auto rounded-3xl p-5">
            <div className="flex items-center gap-2 pb-4">
              <Trophy className="size-4 text-primary" />
              <h3 className="text-[13px] font-semibold">Chaveamento real</h3>
            </div>
            <div className="grid min-w-[650px] grid-cols-3 gap-4">
              {!detail.matches.length && (
                <PreviewBracket
                  bracketSize={detail.tournament.bracketSize}
                  participants={
                    detail.tournament.mode === "team"
                      ? detail.teams.map((team) => ({
                          id: team.id,
                          displayName: team.name,
                          seed: team.seed,
                        }))
                      : detail.participants
                  }
                  onDrop={(seed) => {
                    if (draggedParticipantId && detail.tournament.mode === "individual")
                      void tournaments.reorderParticipant(draggedParticipantId, seed);
                    setDraggedParticipantId(null);
                  }}
                />
              )}
              {detail.matches.map((match) => {
                const entries =
                  detail.tournament.mode === "team"
                    ? detail.teams.map((team) => ({ id: team.entryId, name: team.name }))
                    : detail.participants
                        .filter((participant) => participant.entryId)
                        .map((participant) => ({
                          id: participant.entryId!,
                          name: participant.displayName,
                        }));
                const left = entries.find((entry) => entry.id === match.leftEntryId);
                const right = entries.find((entry) => entry.id === match.rightEntryId);
                return (
                  <div
                    key={match.id}
                    className={cn(
                      "rounded-2xl border border-border bg-card p-2",
                      match.status === "finished" && "opacity-70",
                    )}
                  >
                    <p className="px-2 pb-1 text-[10px] text-muted-foreground">
                      Rodada {match.roundNumber} · Partida {match.matchNumber}
                    </p>
                    {[left, right].map((entry, index) => (
                      <button
                        key={index}
                        disabled={!entry || match.status === "finished"}
                        onClick={() => entry && void tournaments.setWinner(match.id, entry.id)}
                        className={cn(
                          "flex w-full px-2 py-2 text-left text-[13px]",
                          index === 0 && "border-b border-border",
                          match.winnerEntryId === entry?.id && "text-primary",
                        )}
                      >
                        {entry?.name ?? "A definir"}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <CreateItemDialog
        open={creating}
        onOpenChange={setCreating}
        title="Novo torneio"
        description="Crie um torneio individual de eliminação simples."
        placeholder="Ex.: Torneio de sexta"
        label="Criar torneio"
        busy={tournaments.busy}
        onSubmit={createTournament}
        options={[
          { label: "Individual", value: "individual" },
          { label: "Times", value: "team" },
        ]}
      />
      {detail && (
        <EntitySettingsDialog
          open={configuring}
          onOpenChange={setConfiguring}
          busy={tournaments.busy}
          entityLabel="torneio"
          name={detail.tournament.name}
          description={detail.tournament.description}
          onSave={({ name, description }) => tournaments.update(name, description)}
          onDelete={() => tournaments.delete()}
        />
      )}
      <BaseConfirmDialog
        open={deletingTeam !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTeam(null);
        }}
        busy={tournaments.busy}
        title="Excluir equipe?"
        description={`“${deletingTeam?.name ?? ""}” será excluída. Seus participantes voltarão para a fila de participantes.`}
        onConfirm={async () => {
          if (!deletingTeam) return;
          await tournaments.removeTeam(deletingTeam.id);
          setDeletingTeam(null);
        }}
      />
      <Dialog open={capturing} onOpenChange={setCapturing}>
        <DialogContent className="glass-panel max-h-[85vh] max-w-lg border-border-strong bg-popover/95">
          <DialogHeader>
            <DialogTitle>Capturar participantes do chat</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="min-h-0 overflow-y-auto py-2">
              <ParticipantChatCapturePanel
                target="tournament"
                targetId={detail.tournament.id}
                onRefresh={async () => {
                  await tournaments.reload(detail.tournament.id);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      {detail?.tournament.status === "finished" && detail.championEntryId && (
        <FocusedChatPanel target="tournaments" targetId={detail.tournament.id} />
      )}
    </div>
  );
}

function PreviewBracket({
  bracketSize,
  participants,
  onDrop,
}: {
  bracketSize: number;
  participants: Array<{ id: string; displayName: string; seed: number | null }>;
  onDrop(seed: number): void;
}) {
  const bySeed = new Map(participants.map((participant) => [participant.seed, participant]));
  const rounds = Math.log2(bracketSize);

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Primeira rodada
        </p>
        {Array.from({ length: bracketSize / 2 }, (_, matchIndex) => (
          <div
            key={matchIndex}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            {[matchIndex * 2 + 1, matchIndex * 2 + 2].map((seed, slotIndex) => {
              const participant = bySeed.get(seed);
              return (
                <div
                  key={seed}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onDrop(seed)}
                  className={cn(
                    "flex min-h-9 items-center px-3 text-[12.5px] transition-colors",
                    slotIndex === 0 && "border-b border-border",
                    participant ? "text-foreground" : "border-dashed text-muted-foreground",
                  )}
                >
                  <span className="mr-2 text-[10px] tabular-nums opacity-50">{seed}</span>
                  {participant?.displayName ?? "Arraste um participante"}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {Array.from({ length: rounds - 1 }, (_, roundIndex) => (
        <div key={roundIndex} className="flex flex-col justify-around gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {roundIndex === rounds - 2 ? "Final" : `Rodada ${roundIndex + 2}`}
          </p>
          {Array.from({ length: bracketSize / 2 ** (roundIndex + 2) }, (_, matchIndex) => (
            <div
              key={matchIndex}
              className="overflow-hidden rounded-2xl border border-border bg-card/60 opacity-60"
            >
              <div className="border-b border-border px-3 py-2 text-[12px] text-muted-foreground">
                A definir
              </div>
              <div className="px-3 py-2 text-[12px] text-muted-foreground">A definir</div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
