import {
  IntegrationConnectionSchema,
  type SaveIntegrationConnectionRequest,
} from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const integrationApi = {
  deleteConnection: (id: string) =>
    apiClient.request(`/api/v1/integrations/connections/${id}`, { method: "DELETE" }),
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
};
