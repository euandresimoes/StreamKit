import {
  type BackendConnection,
  BackendConnectionSchema,
  type UpdateAppSettingsRequest,
  type UpdateCommand,
  type UpdateState,
} from "@streamlet/contracts";

declare global {
  interface Window {
    streamlet?: {
      getBackendConnection(): Promise<BackendConnection>;
      copyText(text: string): Promise<void>;
      showNativeNotification(title: string, body: string): Promise<void>;
      applySettings(settings: UpdateAppSettingsRequest): Promise<void>;
      openExternalAuth(url: string): Promise<void>;
      openLogsDirectory(): Promise<void>;
      updateCommand(command: UpdateCommand): Promise<UpdateState>;
      updateState(): Promise<UpdateState | undefined>;
      onUpdateState(listener: (state: UpdateState) => void): () => void;
      onFullscreenState(listener: (fullscreen: boolean) => void): () => void;
    };
  }
}

export function getDesktopBridge() {
  if (!window.streamlet) throw new Error("The Streamlet desktop integration is not available.");
  return window.streamlet;
}

let connectionPromise: Promise<BackendConnection> | undefined;

export function getBackendConnection(): Promise<BackendConnection> {
  if (!window.streamlet) {
    return Promise.reject(new Error("The Streamlet API is only available in the desktop app."));
  }
  connectionPromise ??= window.streamlet.getBackendConnection().then(BackendConnectionSchema.parse);
  return connectionPromise;
}
