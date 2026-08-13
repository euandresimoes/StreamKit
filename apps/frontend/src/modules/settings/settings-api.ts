import {
  AppSettingsSchema,
  CredentialStatusSchema,
  DiagnosticInfoSchema,
  type UpdateAppSettingsRequest,
} from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const settingsApi = {
  diagnostics: () =>
    apiClient.request("/api/v1/system/diagnostics", { schema: DiagnosticInfoSchema }),
  get: () => apiClient.request("/api/v1/settings", { schema: AppSettingsSchema }),
  update: (input: UpdateAppSettingsRequest) =>
    apiClient.request("/api/v1/settings", {
      method: "PUT",
      body: input,
      schema: AppSettingsSchema,
    }),
  credentialStatus: () =>
    apiClient.request("/api/v1/settings/credentials/livepix", { schema: CredentialStatusSchema }),
  saveCredential: (credential: string) =>
    apiClient.request("/api/v1/settings/credentials/livepix", {
      method: "PUT",
      body: { credential },
      schema: CredentialStatusSchema,
    }),
  removeCredential: () =>
    apiClient.request("/api/v1/settings/credentials/livepix", { method: "DELETE" }),
};
