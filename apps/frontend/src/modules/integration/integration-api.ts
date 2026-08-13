import {
  FocusedChatThreadSchema,
  IntegrationConnectionSchema,
  type SaveIntegrationConnectionRequest,
  TwitchAuthorizationStatusSchema,
  TwitchDeviceAuthorizationPollSchema,
  TwitchDeviceAuthorizationSchema,
} from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const integrationApi = {
  focusedChat: (target: "giveaways" | "tournaments", id: string) =>
    apiClient.request(`/api/v1/integrations/focused-chat/${target}/${id}`, {
      schema: FocusedChatThreadSchema,
    }),
  sendMessage: (connectionId: string, message: string) =>
    apiClient.request(`/api/v1/integrations/connections/${connectionId}/messages`, {
      body: { message },
      method: "POST",
    }),
  deleteConnection: (id: string) =>
    apiClient.request(`/api/v1/integrations/connections/${id}`, { method: "DELETE" }),
  startConnection: (id: string) =>
    apiClient.request(`/api/v1/integrations/connections/${id}/start`, { method: "PUT" }),
  stopConnection: (id: string) =>
    apiClient.request(`/api/v1/integrations/connections/${id}/stop`, { method: "PUT" }),
  listConnections: () =>
    apiClient.request("/api/v1/integrations/connections", {
      schema: IntegrationConnectionSchema.array(),
    }),
  saveConnection: (input: SaveIntegrationConnectionRequest) =>
    apiClient.request("/api/v1/integrations/connections", {
      body: input,
      method: "PUT",
      schema: IntegrationConnectionSchema,
    }),
  twitchAuthStatus: () =>
    apiClient.request("/api/v1/integrations/twitch/auth/status", {
      schema: TwitchAuthorizationStatusSchema,
    }),
  beginTwitchAuth: () =>
    apiClient.request("/api/v1/integrations/twitch/auth/device", {
      method: "POST",
      schema: TwitchDeviceAuthorizationSchema,
    }),
  pollTwitchAuth: (flowId: string) =>
    apiClient.request(`/api/v1/integrations/twitch/auth/device/${flowId}/poll`, {
      method: "POST",
      schema: TwitchDeviceAuthorizationPollSchema,
    }),
  disconnectTwitch: () =>
    apiClient.request("/api/v1/integrations/twitch/auth", {
      method: "DELETE",
      schema: TwitchAuthorizationStatusSchema,
    }),
};
