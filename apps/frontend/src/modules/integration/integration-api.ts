import {
  ChatSimulationStatusSchema,
  FocusedChatThreadSchema,
  IntegrationConnectionSchema,
  KickIntegrationSupportSchema,
  type SaveIntegrationConnectionRequest,
  TwitchAuthorizationStatusSchema,
  TwitchDeviceAuthorizationPollSchema,
  TwitchDeviceAuthorizationSchema,
  YouTubeAuthorizationPollSchema,
  YouTubeAuthorizationStartSchema,
  YouTubeAuthorizationStatusSchema,
  YouTubeLiveBroadcastSchema,
} from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const integrationApi = {
  focusedChat: (target: "giveaways" | "tournaments", id: string) =>
    apiClient.request(`/api/v1/integrations/focused-chat/${target}/${id}`, {
      schema: FocusedChatThreadSchema,
    }),
  tournamentMatchChat: (tournamentId: string, matchId: string, side: "left" | "right") =>
    apiClient.request(
      `/api/v1/integrations/focused-chat/tournaments/${tournamentId}/matches/${matchId}/${side}`,
      {
        schema: FocusedChatThreadSchema,
      },
    ),
  kickSupport: () =>
    apiClient.request("/api/v1/integrations/kick/support", {
      schema: KickIntegrationSupportSchema,
    }),
  simulationStatus: () =>
    apiClient.request("/api/v1/integrations/debug/simulation", {
      schema: ChatSimulationStatusSchema,
    }),
  startSimulation: (body: {
    channelId: string;
    count: 8 | 16 | 32 | 1000 | 10000;
    duplicateEvery: number;
    message: string;
    mode: "instant" | "gradual" | "burst";
    provider: "kick" | "twitch" | "youtube";
  }) =>
    apiClient.request("/api/v1/integrations/debug/simulation", {
      body,
      method: "POST",
      schema: ChatSimulationStatusSchema,
    }),
  stopSimulation: () =>
    apiClient.request("/api/v1/integrations/debug/simulation", {
      method: "DELETE",
      schema: ChatSimulationStatusSchema,
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
  youtubeAuthStatus: () =>
    apiClient.request("/api/v1/integrations/youtube/auth/status", {
      schema: YouTubeAuthorizationStatusSchema,
    }),
  beginYouTubeAuth: () =>
    apiClient.request("/api/v1/integrations/youtube/auth", {
      method: "POST",
      schema: YouTubeAuthorizationStartSchema,
    }),
  pollYouTubeAuth: (flowId: string) =>
    apiClient.request(`/api/v1/integrations/youtube/auth/${flowId}/poll`, {
      method: "POST",
      schema: YouTubeAuthorizationPollSchema,
    }),
  disconnectYouTube: () =>
    apiClient.request("/api/v1/integrations/youtube/auth", {
      method: "DELETE",
      schema: YouTubeAuthorizationStatusSchema,
    }),
  listYouTubeBroadcasts: () =>
    apiClient.request("/api/v1/integrations/youtube/broadcasts", {
      schema: YouTubeLiveBroadcastSchema.array(),
    }),
  selectYouTubeBroadcast: (broadcast: { liveChatId: string; title: string; videoId: string }) =>
    apiClient.request("/api/v1/integrations/youtube/broadcasts/select", {
      body: broadcast,
      method: "POST",
      schema: IntegrationConnectionSchema,
    }),
};
