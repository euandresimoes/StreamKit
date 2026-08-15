import {
  AppSettingsSchema,
  CredentialStatusSchema,
  DiagnosticInfoSchema,
  PaymentConnectionStatusSchema,
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
  youtubeClientSecretStatus: () =>
    apiClient.request("/api/v1/settings/credentials/youtube-client-secret", {
      schema: CredentialStatusSchema,
    }),
  saveYouTubeClientSecret: (credential: string) =>
    apiClient.request("/api/v1/settings/credentials/youtube-client-secret", {
      body: { credential },
      method: "PUT",
      schema: CredentialStatusSchema,
    }),
  saveTwitchClientId: (credential: string) =>
    apiClient.request("/api/v1/settings/credentials/twitch-client-id", {
      body: { credential },
      method: "PUT",
      schema: CredentialStatusSchema,
    }),
  saveYouTubeClientId: (credential: string) =>
    apiClient.request("/api/v1/settings/credentials/youtube-client-id", {
      body: { credential },
      method: "PUT",
      schema: CredentialStatusSchema,
    }),
  livepixStatus: () =>
    apiClient.request("/api/v1/payments/livepix/status", { schema: PaymentConnectionStatusSchema }),
  connectLivepix: () =>
    apiClient.request("/api/v1/payments/livepix/connect", {
      method: "POST",
      schema: PaymentConnectionStatusSchema,
    }),
  disconnectLivepix: () =>
    apiClient.request("/api/v1/payments/livepix/connect", {
      method: "DELETE",
      schema: PaymentConnectionStatusSchema,
    }),
};
