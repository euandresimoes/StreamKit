import type { AppSettings, UpdateAppSettingsRequest } from "@streamkit/contracts";
import { useCallback, useEffect, useState } from "react";

import { getDesktopBridge } from "@/infrastructure/desktop-bridge";
import { settingsApi } from "./settings-api";

export function useSettings(active: boolean) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [credentialConfigured, setCredentialConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextSettings, credential] = await Promise.all([
        settingsApi.get(),
        settingsApi.credentialStatus(),
      ]);
      setSettings(nextSettings);
      setCredentialConfigured(credential.configured);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível carregar as configurações.",
      );
    }
  }, []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const update = async (patch: Partial<UpdateAppSettingsRequest>) => {
    if (!settings) return;
    setBusy(true);
    try {
      const input: UpdateAppSettingsRequest = {
        confirmExitDuringActive: settings.confirmExitDuringActive,
        debugEnabled: settings.debugEnabled,
        minimizeToTray: settings.minimizeToTray,
        openAtLogin: settings.openAtLogin,
        reduceMotion: settings.reduceMotion,
        theme: settings.theme,
        updatePreference: settings.updatePreference,
        ...patch,
      };
      const saved = await settingsApi.update(input);
      await getDesktopBridge().applySettings(input);
      setSettings(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a configuração.");
    } finally {
      setBusy(false);
    }
  };

  return {
    settings,
    credentialConfigured,
    busy,
    error,
    update,
    saveCredential: async (credential: string) => {
      setBusy(true);
      try {
        const result = await settingsApi.saveCredential(credential);
        setCredentialConfigured(result.configured);
      } finally {
        setBusy(false);
      }
    },
    removeCredential: async () => {
      setBusy(true);
      try {
        await settingsApi.removeCredential();
        setCredentialConfigured(false);
      } finally {
        setBusy(false);
      }
    },
    checkUpdates: () => getDesktopBridge().updateCommand({ action: "check", manual: true }),
    openLogsDirectory: () => getDesktopBridge().openLogsDirectory(),
  };
}
