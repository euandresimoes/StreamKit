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
      copyText(text: string): Promise<void>;
      applySettings(settings: UpdateAppSettingsRequest): Promise<void>;
      openExternalAuth(url: string): Promise<void>;
      openLogsDirectory(): Promise<void>;
      updateCommand(command: UpdateCommand): Promise<UpdateState>;
      updateState(): Promise<UpdateState | undefined>;
      onFullscreenState(listener: (fullscreen: boolean) => void): () => void;
    };
  }
}

export function getDesktopBridge() {
  if (!window.streamkit) throw new Error("The StreamKit desktop integration is not available.");
  return window.streamkit;
}

let connectionPromise: Promise<BackendConnection> | undefined;

export function getBackendConnection(): Promise<BackendConnection> {
  if (!window.streamkit) {
    return Promise.reject(new Error("The StreamKit API is only available in the desktop app."));
  }
  connectionPromise ??= window.streamkit.getBackendConnection().then(BackendConnectionSchema.parse);
  return connectionPromise;
}
