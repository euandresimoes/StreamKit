import type { AppSettings, UpdateAppSettingsRequest, UpdateState } from "@streamlet/contracts";
import { useCallback, useEffect, useState } from "react";

import { getDesktopBridge } from "@/infrastructure/desktop-bridge";
import { settingsApi } from "./settings-api";
import i18n from "@/i18n";
import { getLocalizedReleaseNotes } from "./release-notes";

function applyTheme(theme: AppSettings["theme"]) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.classList.toggle("light", resolved === "light");
}

export function useSettings(active: boolean) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [credentialConfigured, setCredentialConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [appVersion, setAppVersion] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextSettings, credential] = await Promise.all([
        settingsApi.get(),
        settingsApi.credentialStatus(),
      ]);
      setSettings(nextSettings);
      void i18n.changeLanguage(nextSettings.locale);
      applyTheme(nextSettings.theme);
      document.documentElement.dataset["reduceMotion"] = String(nextSettings["reduceMotion"]);
      setCredentialConfigured(credential.configured);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : i18n.t("errors.loadSettings"));
    }
  }, []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  useEffect(() => {
    if (!active || !window.streamlet?.onUpdateState) return;
    const bridge = getDesktopBridge();
    void bridge.getAppVersion().then(setAppVersion);
    void bridge.updateState().then((state) => {
      if (state) setUpdateState(state);
    });
    return bridge.onUpdateState(setUpdateState);
  }, [active]);

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
        locale: settings.locale,
        theme: settings.theme,
        updatePreference: settings.updatePreference,
        ...patch,
      };
      const saved = await settingsApi.update(input);
      await getDesktopBridge().applySettings(input);
      setSettings(saved);
      void i18n.changeLanguage(saved.locale);
      applyTheme(saved.theme);
      document.documentElement.dataset["reduceMotion"] = String(saved["reduceMotion"]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : i18n.t("errors.saveSettings"));
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
    updateState,
    appVersion,
    localizedReleaseNotes: updateState?.available
      ? getLocalizedReleaseNotes(updateState.available.changelog, settings?.locale ?? "en-US")
      : "",
    checkUpdates: () => getDesktopBridge().updateCommand({ action: "check", manual: true }),
    downloadUpdate: () => getDesktopBridge().updateCommand({ action: "download" }),
    installUpdate: () => getDesktopBridge().updateCommand({ action: "install" }),
    skipUpdate: (version: string) => getDesktopBridge().updateCommand({ action: "skip", version }),
    openLogsDirectory: () => getDesktopBridge().openLogsDirectory(),
    exportDiagnostics: async () => {
      const diagnostic = await settingsApi.diagnostics();
      const blob = new Blob([JSON.stringify(diagnostic, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `streamlet-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
  };
}
