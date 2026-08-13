import {
  type BackendConnection,
  BackendConnectionSchema,
  type UpdateAppSettingsRequest,
  type UpdateCommand,
  type UpdateState,
} from "@streamkit/contracts";

declare global {
  interface Window {
    streamkit?: {
      getBackendConnection(): Promise<BackendConnection>;
      applySettings(settings: UpdateAppSettingsRequest): Promise<void>;
      openLogsDirectory(): Promise<void>;
      updateCommand(command: UpdateCommand): Promise<UpdateState>;
      updateState(): Promise<UpdateState | undefined>;
    };
  }
}

export function getDesktopBridge() {
  if (!window.streamkit) throw new Error("A integração desktop do StreamKit não está disponível.");
  return window.streamkit;
}

let connectionPromise: Promise<BackendConnection> | undefined;

export function getBackendConnection(): Promise<BackendConnection> {
  if (!window.streamkit) {
    return Promise.reject(new Error("A API do StreamKit está disponível somente no aplicativo."));
  }
  connectionPromise ??= window.streamkit.getBackendConnection().then(BackendConnectionSchema.parse);
  return connectionPromise;
}
