import {
  type CompleteTournamentMatchRequest,
  type CreateTournamentRequest,
  type SaveTournamentCaptureRuleRequest,
  TournamentCaptureRuleListSchema,
  TournamentCaptureRuleSchema,
  TournamentDetailSchema,
  TournamentListSchema,
  TournamentSchema,
  type UpdateTournamentRequest,
} from "@streamlet/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const tournamentApi = {
  list: () => apiClient.request("/api/v1/tournaments", { schema: TournamentListSchema }),
  detail: (id: string) =>
    apiClient.request(`/api/v1/tournaments/${id}`, { schema: TournamentDetailSchema }),
  captureRules: (id: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/capture-rules`, {
      schema: TournamentCaptureRuleListSchema,
    }),
  saveCaptureRule: (id: string, input: SaveTournamentCaptureRuleRequest) =>
    apiClient.request(`/api/v1/tournaments/${id}/capture-rules`, {
      method: "POST",
      body: input,
      schema: TournamentCaptureRuleSchema,
    }),
  updateCaptureRule: (id: string, ruleId: string, status: "active" | "completed" | "paused") =>
    apiClient.request(`/api/v1/tournaments/${id}/capture-rules/${ruleId}`, {
      method: "PATCH",
      body: { status },
    }),
  deleteCaptureRule: (id: string, ruleId: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/capture-rules/${ruleId}`, {
      method: "DELETE",
    }),
  create: (input: CreateTournamentRequest) =>
    apiClient.request("/api/v1/tournaments", {
      method: "POST",
      body: input,
      schema: TournamentSchema,
    }),
  update: (id: string, input: UpdateTournamentRequest) =>
    apiClient.request(`/api/v1/tournaments/${id}`, {
      method: "PATCH",
      body: input,
      schema: TournamentSchema,
    }),
  delete: (id: string) => apiClient.request(`/api/v1/tournaments/${id}`, { method: "DELETE" }),
  addParticipant: (
    id: string,
    displayName: string,
    provider: "kick" | "twitch" | "youtube" | null,
    channelId: string | null,
  ) =>
    apiClient.request(`/api/v1/tournaments/${id}/participants`, {
      method: "POST",
      body: { channelId, displayName, provider },
    }),
  removeParticipant: (id: string, participantId: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/participants/${participantId}`, {
      method: "DELETE",
    }),
  addTeam: (id: string, name: string, capacity: number) =>
    apiClient.request(`/api/v1/tournaments/${id}/teams`, {
      method: "POST",
      body: { name, color: "#3B82F6", capacity },
    }),
  updateTeam: (id: string, teamId: string, name: string, capacity: number, color: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/teams/${teamId}`, {
      method: "PATCH",
      body: { name, color, capacity },
    }),
  removeTeam: (id: string, teamId: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/teams/${teamId}`, { method: "DELETE" }),
  addTeamMember: (
    id: string,
    teamId: string,
    displayName: string,
    slotPosition: number,
    provider: "kick" | "twitch" | "youtube" | null,
    channelId: string | null,
  ) =>
    apiClient.request(`/api/v1/tournaments/${id}/teams/${teamId}/members`, {
      method: "POST",
      body: { channelId, displayName, provider, slotPosition },
    }),
  assignParticipant: (id: string, teamId: string, participantId: string, slotPosition: number) =>
    apiClient.request(`/api/v1/tournaments/${id}/teams/${teamId}/members/assign`, {
      method: "POST",
      body: { participantId, slotPosition },
    }),
  moveTeamMember: (
    id: string,
    memberId: string,
    targetTeamId: string,
    targetSlotPosition: number,
  ) =>
    apiClient.request(`/api/v1/tournaments/${id}/team-members/move`, {
      method: "POST",
      body: { memberId, targetTeamId, targetSlotPosition },
    }),
  removeTeamMember: (id: string, memberId: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/team-members/${memberId}`, { method: "DELETE" }),
  shuffleTeamMembers: (id: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/team-members/shuffle`, { method: "POST" }),
  reorderTeam: (id: string, teamId: string, seed: number) =>
    apiClient.request(`/api/v1/tournaments/${id}/teams/${teamId}/reorder`, {
      method: "POST",
      body: { seed },
    }),
  reorderParticipant: (id: string, participantId: string, seed: number) =>
    apiClient.request(`/api/v1/tournaments/${id}/participants/${participantId}/reorder`, {
      method: "POST",
      body: { seed },
    }),
  queueParticipant: (id: string, participantId: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/participants/${participantId}/queue`, {
      method: "POST",
    }),
  shuffle: (id: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/shuffle`, { method: "POST" }),
  generate: (id: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/bracket/generate`, { method: "POST" }),
  start: (id: string) => apiClient.request(`/api/v1/tournaments/${id}/start`, { method: "POST" }),
  startMatch: (id: string, matchId: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/matches/${matchId}/start`, { method: "POST" }),
  completeMatch: (id: string, matchId: string, result: CompleteTournamentMatchRequest) =>
    apiClient.request(`/api/v1/tournaments/${id}/matches/${matchId}/result`, {
      method: "POST",
      body: result,
    }),
  undoMatch: (id: string, matchId: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/matches/${matchId}/undo`, { method: "POST" }),
  winner: (id: string, matchId: string, winnerEntryId: string) =>
    apiClient.request(`/api/v1/tournaments/${id}/matches/${matchId}/winner`, {
      method: "POST",
      body: { winnerEntryId },
    }),
};
