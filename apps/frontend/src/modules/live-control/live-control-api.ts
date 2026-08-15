import {
  type ChatModerationRequest,
  ChatModerationRequestSchema,
  FocusedChatThreadSchema,
  LiveStreamSchema,
} from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const liveControlApi = {
  selectGlobal: (connectionId: string) =>
    apiClient.request(`/api/v1/integrations/live-control/selection/${connectionId}`, {
      method: "PUT",
    }),
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
};
