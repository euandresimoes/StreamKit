import type { CreateTournamentRequest, Tournament, TournamentDetail } from "@streamkit/contracts";
import { useCallback, useEffect, useState } from "react";

import { tournamentApi } from "./tournament-api";

export function useTournaments() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (preferredId?: string) => {
    setError(null);
    try {
      const list = await tournamentApi.list();
      setItems(list.items);
      const id = preferredId ?? list.items[0]?.id;
      setDetail(id ? await tournamentApi.detail(id) : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os torneios.");
    }
  }, []);
  useEffect(() => void load(), [load]);

  const mutate = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      await load(detail?.tournament.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A operação não pôde ser concluída.");
    } finally {
      setBusy(false);
    }
  };

  return {
    items,
    detail,
    busy,
    error,
    select: (id: string) => load(id),
    create: async (input: CreateTournamentRequest) => {
      setBusy(true);
      try {
        await tournamentApi.create(input);
        await load();
      } finally {
        setBusy(false);
      }
    },
    addParticipant: (name: string) =>
      detail ? mutate(() => tournamentApi.addParticipant(detail.tournament.id, name)) : undefined,
    removeParticipant: (participantId: string) =>
      detail
        ? mutate(() => tournamentApi.removeParticipant(detail.tournament.id, participantId))
        : undefined,
    addTeam: (name: string) =>
      detail
        ? mutate(() =>
            tournamentApi.addTeam(detail.tournament.id, name, detail.tournament.teamCapacity ?? 1),
          )
        : undefined,
    updateTeam: (teamId: string, name: string, capacity: number, color: string) =>
      detail
        ? mutate(() =>
            tournamentApi.updateTeam(detail.tournament.id, teamId, name, capacity, color),
          )
        : undefined,
    removeTeam: (teamId: string) =>
      detail ? mutate(() => tournamentApi.removeTeam(detail.tournament.id, teamId)) : undefined,
    addTeamMember: (teamId: string, name: string, slot: number) =>
      detail
        ? mutate(() => tournamentApi.addTeamMember(detail.tournament.id, teamId, name, slot))
        : undefined,
    assignParticipant: (teamId: string, participantId: string, slot: number) =>
      detail
        ? mutate(() =>
            tournamentApi.assignParticipant(detail.tournament.id, teamId, participantId, slot),
          )
        : undefined,
    moveTeamMember: (memberId: string, teamId: string, slot: number) =>
      detail
        ? mutate(() => tournamentApi.moveTeamMember(detail.tournament.id, memberId, teamId, slot))
        : undefined,
    removeTeamMember: (memberId: string) =>
      detail
        ? mutate(() => tournamentApi.removeTeamMember(detail.tournament.id, memberId))
        : undefined,
    shuffleTeamMembers: () =>
      detail ? mutate(() => tournamentApi.shuffleTeamMembers(detail.tournament.id)) : undefined,
    reorderTeam: (teamId: string, seed: number) =>
      detail
        ? mutate(() => tournamentApi.reorderTeam(detail.tournament.id, teamId, seed))
        : undefined,
    reorderParticipant: (participantId: string, seed: number) =>
      detail
        ? mutate(() => tournamentApi.reorderParticipant(detail.tournament.id, participantId, seed))
        : undefined,
    queueParticipant: (participantId: string) =>
      detail
        ? mutate(() => tournamentApi.queueParticipant(detail.tournament.id, participantId))
        : undefined,
    shuffle: () => (detail ? mutate(() => tournamentApi.shuffle(detail.tournament.id)) : undefined),
    start: () =>
      detail
        ? mutate(async () => {
            if (!detail.matches.length) await tournamentApi.generate(detail.tournament.id);
            await tournamentApi.start(detail.tournament.id);
          })
        : undefined,
    startMatch: (matchId: string) =>
      detail ? mutate(() => tournamentApi.startMatch(detail.tournament.id, matchId)) : undefined,
    completeMatch: (
      matchId: string,
      leftResult: "won" | "lost" | "forfeit" | "draw",
      rightResult: "won" | "lost" | "forfeit" | "draw",
    ) =>
      detail
        ? mutate(() =>
            tournamentApi.completeMatch(detail.tournament.id, matchId, { leftResult, rightResult }),
          )
        : undefined,
    undoMatch: (matchId: string) =>
      detail ? mutate(() => tournamentApi.undoMatch(detail.tournament.id, matchId)) : undefined,
    setWinner: (matchId: string, entryId: string) =>
      detail
        ? mutate(() => tournamentApi.winner(detail.tournament.id, matchId, entryId))
        : undefined,
    update: (name: string, description: string | null) =>
      detail
        ? mutate(() => tournamentApi.update(detail.tournament.id, { name, description }))
        : undefined,
    updateStructure: (mode: "individual" | "team", bracketSize: 4 | 8 | 16 | 32) =>
      detail
        ? mutate(() =>
            tournamentApi.update(detail.tournament.id, {
              name: detail.tournament.name,
              description: detail.tournament.description,
              mode,
              bracketSize,
              teamCapacity: mode === "team" ? (detail.tournament.teamCapacity ?? 3) : null,
            }),
          )
        : undefined,
    delete: async () => {
      if (!detail) return;
      setBusy(true);
      setError(null);
      try {
        await tournamentApi.delete(detail.tournament.id);
        setDetail(null);
        await load();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível excluir o torneio.");
      } finally {
        setBusy(false);
      }
    },
    reload: load,
  };
}
