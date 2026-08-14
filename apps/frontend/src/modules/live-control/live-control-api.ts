import {
  type ChatModerationRequest,
  ChatModerationRequestSchema,
  FocusedChatThreadSchema,
  type LiveMetadataUpdate,
  LiveMetadataUpdateSchema,
  LiveStreamSchema,
} from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const liveControlApi = {
  list: () =>
    apiClient.request("/api/v1/integrations/live-control", { schema: LiveStreamSchema.array() }),
  chat: (id: string) =>
    apiClient.request(`/api/v1/integrations/live-control/${id}/chat`, {
      schema: FocusedChatThreadSchema,
    }),
  moderateChat: (id: string, input: ChatModerationRequest) =>
    apiClient.request(`/api/v1/integrations/live-control/${id}/chat/actions`, {
      body: ChatModerationRequestSchema.parse(input),
      method: "POST",
      schema: ChatModerationRequestSchema.pick({ action: true, externalMessageId: true }),
    }),
  updateMetadata: (id: string, input: LiveMetadataUpdate) =>
    apiClient.request(`/api/v1/integrations/live-control/${id}/metadata`, {
      body: LiveMetadataUpdateSchema.parse(input),
      method: "PUT",
      schema: LiveStreamSchema,
    }),
};
