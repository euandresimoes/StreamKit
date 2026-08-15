import type {
  ExternalTransportSnapshot,
  IntegrationConnection,
  KickIntegrationSupport,
  SaveIntegrationConnectionRequest,
  TwitchAuthorizationStatus,
  TwitchDeviceAuthorization,
  YouTubeAuthorizationStatus,
  YouTubeLiveBroadcast,
} from "@streamkit/contracts";
import { useCallback, useEffect, useState } from "react";

import { getDesktopBridge } from "@/infrastructure/desktop-bridge";
import { integrationApi } from "./integration-api";
import i18n from "@/i18n";

export function useIntegrations(active: boolean) {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twitchAuth, setTwitchAuth] = useState<TwitchAuthorizationStatus | null>(null);
  const [twitchDevice, setTwitchDevice] = useState<TwitchDeviceAuthorization | null>(null);
  const [youtubeAuth, setYouTubeAuth] = useState<YouTubeAuthorizationStatus | null>(null);
  const [youtubeBroadcasts, setYouTubeBroadcasts] = useState<YouTubeLiveBroadcast[]>([]);
  const [kickSupport, setKickSupport] = useState<KickIntegrationSupport | null>(null);
  const [externalTransport, setExternalTransport] = useState<ExternalTransportSnapshot | null>(
    null,
  );
  const load = useCallback(async () => {
    try {
      setError(null);
      const [
        nextConnections,
        nextTwitchAuth,
        nextYouTubeAuth,
        nextKickSupport,
        nextExternalTransport,
      ] = await Promise.all([
        integrationApi.listConnections(),
        integrationApi.twitchAuthStatus(),
        integrationApi.youtubeAuthStatus(),
        integrationApi.kickSupport(),
        integrationApi.externalTransportStatus(),
      ]);
      setConnections(nextConnections);
      setTwitchAuth(nextTwitchAuth);
      setYouTubeAuth(nextYouTubeAuth);
      setKickSupport(nextKickSupport);
      setExternalTransport(nextExternalTransport);
      if (!nextYouTubeAuth.configured) {
        setYouTubeBroadcasts([]);
      } else {
        try {
          setYouTubeBroadcasts(await integrationApi.listYouTubeBroadcasts());
        } catch {
          setYouTubeBroadcasts([]);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : i18n.t("errors.loadIntegrations"));
    }
  }, []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);
  const execute = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : i18n.t("errors.updateIntegration"));
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    connections,
    error,
    twitchAuth,
    twitchDevice,
    youtubeAuth,
    youtubeBroadcasts,
    kickSupport,
    externalTransport,
    connectTwitch: async () => {
      setBusy(true);
      setError(null);
      try {
        const device = await integrationApi.beginTwitchAuth();
        setTwitchDevice(device);
        await getDesktopBridge().openExternalAuth(device.verificationUri);
        while (Date.parse(device.expiresAt) > Date.now()) {
          await new Promise((resolve) => setTimeout(resolve, device.intervalSeconds * 1_000));
          const result = await integrationApi.pollTwitchAuth(device.flowId);
          if (result.status === "pending") continue;
          if (result.status === "expired") throw new Error(i18n.t("errors.twitchExpired"));
          setTwitchAuth(result.authorization);
          setTwitchDevice(null);
          await load();
          return;
        }
        throw new Error(i18n.t("errors.twitchExpired"));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : i18n.t("errors.connectTwitch"));
      } finally {
        setBusy(false);
      }
    },
    disconnectTwitch: () =>
      execute(async () => {
        setTwitchAuth(await integrationApi.disconnectTwitch());
        setTwitchDevice(null);
      }),
    connectYouTube: async () => {
      setBusy(true);
      setError(null);
      try {
        const flow = await integrationApi.beginYouTubeAuth();
        await getDesktopBridge().openExternalAuth(flow.authorizationUrl);
        while (Date.parse(flow.expiresAt) > Date.now()) {
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          const result = await integrationApi.pollYouTubeAuth(flow.flowId);
          if (result.status === "pending") continue;
          if (result.status === "failed") throw new Error(result.error);
          if (result.status === "expired") throw new Error(i18n.t("errors.youtubeExpired"));
          setYouTubeAuth(result.authorization);
          try {
            setYouTubeBroadcasts(await integrationApi.listYouTubeBroadcasts());
          } catch {
            setYouTubeBroadcasts([]);
          }
          await load();
          return;
        }
        throw new Error(i18n.t("errors.youtubeExpired"));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : i18n.t("errors.connectYoutube"));
      } finally {
        setBusy(false);
      }
    },
    disconnectYouTube: () =>
      execute(async () => {
        setYouTubeAuth(await integrationApi.disconnectYouTube());
        setYouTubeBroadcasts([]);
      }),
    discoverYouTubeBroadcasts: () =>
      execute(async () => setYouTubeBroadcasts(await integrationApi.listYouTubeBroadcasts())),
    selectYouTubeBroadcast: (broadcast: YouTubeLiveBroadcast) =>
      execute(() => integrationApi.selectYouTubeBroadcast(broadcast)),
    remove: (id: string) => execute(() => integrationApi.deleteConnection(id)),
    save: (input: SaveIntegrationConnectionRequest) =>
      execute(() => integrationApi.saveConnection(input)),
    start: (id: string) => execute(() => integrationApi.startConnection(id)),
    stop: (id: string) => execute(() => integrationApi.stopConnection(id)),
  };
}
