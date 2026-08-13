import {
  type CreateGiveawayRequest,
  type DuplicatePolicy,
  GiveawayDetailSchema,
  GiveawayHistorySchema,
  GiveawayListSchema,
  GiveawayRoundSchema,
  GiveawaySchema,
  type UpdateGiveawayRequest,
} from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const giveawayApi = {
  list: () => apiClient.request("/api/v1/giveaways", { schema: GiveawayListSchema }),
  detail: (id: string) =>
    apiClient.request(`/api/v1/giveaways/${id}`, { schema: GiveawayDetailSchema }),
  history: (id: string) =>
    apiClient.request(`/api/v1/giveaways/${id}/history`, { schema: GiveawayHistorySchema }),
  create: (input: CreateGiveawayRequest) =>
    apiClient.request("/api/v1/giveaways", {
      method: "POST",
      body: input,
      schema: GiveawaySchema,
    }),
  import: (id: string, input: string, policy: DuplicatePolicy) =>
    apiClient.request(`/api/v1/giveaways/${id}/participants/import`, {
      method: "POST",
      body: { input, policy },
    }),
  removeParticipant: (id: string, participantId: string) =>
    apiClient.request(`/api/v1/giveaways/${id}/participants/${participantId}`, {
      method: "DELETE",
    }),
  update: (id: string, input: UpdateGiveawayRequest) =>
    apiClient.request(`/api/v1/giveaways/${id}`, {
      method: "PATCH",
      body: input,
      schema: GiveawaySchema,
    }),
  delete: (id: string) => apiClient.request(`/api/v1/giveaways/${id}`, { method: "DELETE" }),
  prepare: (id: string) => apiClient.request(`/api/v1/giveaways/${id}/prepare`, { method: "POST" }),
  draw: (id: string) =>
    apiClient.request(`/api/v1/giveaways/${id}/draw`, {
      method: "POST",
      schema: GiveawayRoundSchema,
    }),
  complete: (id: string, roundId: string) =>
    apiClient.request(`/api/v1/giveaways/${id}/rounds/${roundId}/complete`, { method: "POST" }),
  nextRound: (id: string, removeWinner: boolean) =>
    apiClient.request(`/api/v1/giveaways/${id}/next-round`, {
      method: "POST",
      body: { removeWinner },
    }),
};
