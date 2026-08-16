import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Download, MonitorCog, Palette, Plug, RefreshCw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BaseBrandIcon, brandName } from "@/components/base/BaseBrandIcon";
import { useIntegrations } from "@/modules/integration/use-integrations";
import { useSettings } from "@/modules/settings/use-settings";
import { settingsApi } from "@/modules/settings/settings-api";
import i18n from "@/i18n";
import { ProviderSetupWizard } from "./provider-guides/ProviderSetupWizard";
import type { ProviderGuideId } from "./provider-guides/types";

type Section = "appearance" | "system" | "integrations" | "updates";

const nav: { id: Section; labelKey: string; icon: typeof Palette; hintKey: string }[] = [
  {
    id: "appearance",
    labelKey: "settings.appearance",
    icon: Palette,
    hintKey: "settings.appearanceHint",
  },
  { id: "system", labelKey: "settings.system", icon: MonitorCog, hintKey: "settings.systemHint" },
  {
    id: "integrations",
    labelKey: "settings.integrations",
    icon: Plug,
    hintKey: "settings.integrationsHint",
  },
  { id: "updates", labelKey: "settings.updates", icon: RefreshCw, hintKey: "settings.version" },
];

const themes = [
  { id: "dark" as const, labelKey: "settings.dark", swatch: "oklch(0.12 0 0)" },
  { id: "light" as const, labelKey: "settings.light", swatch: "oklch(0.97 0.004 75)" },
] as const;

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-1">
        <p className="text-[13px] font-medium">{title}</p>
        {description && <p className="text-[11.5px] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [section, setSection] = useState<Section>("appearance");
  const [density, setDensity] = useState(true);
  const [hardware, setHardware] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [beta, setBeta] = useState(false);
  const [livepixStatus, setLivepixStatus] = useState<Awaited<
    ReturnType<typeof settingsApi.livepixStatus>
  > | null>(null);
  const [livepixBusy, setLivepixBusy] = useState(false);
  const [livepixError, setLivepixError] = useState<string | null>(null);
  const [setupProvider, setSetupProvider] = useState<ProviderGuideId | null>(null);
  const { t } = useTranslation(undefined, { i18n });
  const persisted = useSettings(open);
  const integrations = useIntegrations(open && section === "integrations");
  const theme = persisted.settings?.theme ?? "dark";
  useEffect(() => {
    if (open && section === "integrations")
      void settingsApi
        .livepixStatus()
        .then(setLivepixStatus)
        .catch(() => undefined);
  }, [open, section]);

  const saveLivepix = async (credentials: { clientId: string; clientSecret: string }) => {
    setLivepixBusy(true);
    setLivepixError(null);
    try {
      await settingsApi.saveCredential(JSON.stringify(credentials));
      setLivepixStatus(await settingsApi.connectLivepix());
      setSetupProvider(null);
    } catch (cause) {
      setLivepixError(cause instanceof Error ? cause.message : "Could not connect LivePix.");
    } finally {
      setLivepixBusy(false);
    }
  };

  const disconnectLivepix = async () => {
    setLivepixBusy(true);
    setLivepixError(null);
    try {
      setLivepixStatus(await settingsApi.disconnectLivepix());
    } catch (cause) {
      setLivepixError(cause instanceof Error ? cause.message : "Could not disconnect LivePix.");
    } finally {
      setLivepixBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel h-[min(720px,calc(100vh-2rem))] w-[min(960px,calc(100vw-2rem))] max-w-none gap-0 overflow-hidden rounded-3xl border-border-strong bg-popover/95 p-0">
        <DialogTitle className="sr-only">{t("settings.title")}</DialogTitle>

        <div className="flex h-full min-h-0">
          {/* Aside */}
          <aside className="min-h-0 w-[220px] shrink-0 overflow-y-auto border-r border-border bg-surface-2/40 p-3">
            <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("settings.title")}
            </p>
            <nav className="flex flex-col gap-0.5">
              {nav.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  className={cn(
                    "press flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-200",
                    section === n.id
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <n.icon className="size-4" />
                  <span className="flex-1">
                    <span className="block text-[12.5px] font-medium">{t(n.labelKey)}</span>
                    <span className="block text-[10.5px] opacity-70">{t(n.hintKey)}</span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Panel */}
          <main key={section} className="animate-sk-in min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
            {section === "appearance" && (
              <div>
                <h3 className="text-[15px] font-semibold">{t("settings.appearance")}</h3>
                <p className="text-[12px] text-muted-foreground">{t("settings.themeComfort")}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {themes.map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => void persisted.update({ theme: themeOption.id })}
                      className={cn(
                        "raise rounded-2xl border p-3 text-left",
                        theme === themeOption.id
                          ? "border-primary bg-surface-2/70"
                          : "border-border",
                      )}
                    >
                      <span
                        className="block h-12 w-full rounded-xl border border-border"
                        style={{ backgroundColor: themeOption.swatch }}
                      />
                      <span className="mt-2 flex items-center gap-1 text-[12px] font-medium">
                        {t(themeOption.labelKey)}
                        {theme === themeOption.id && <Check className="size-3 text-primary" />}
                      </span>
                    </button>
                  ))}
                </div>
                <Separator className="my-4" />
                <Row
                  title={t("settings.compactMode")}
                  description={t("settings.compactDescription")}
                >
                  <Switch checked={density} onCheckedChange={setDensity} />
                </Row>
                <Row
                  title={t("settings.reduceMotion")}
                  description={t("settings.reduceMotionDescription")}
                >
                  <Switch
                    checked={persisted.settings?.reduceMotion ?? false}
                    onCheckedChange={(value) => void persisted.update({ reduceMotion: value })}
                  />
                </Row>
              </div>
            )}

            {section === "system" && (
              <div>
                <h3 className="text-[15px] font-semibold">{t("settings.system")}</h3>
                <p className="text-[12px] text-muted-foreground">
                  {t("settings.systemDescription")}
                </p>
                <div className="mt-3 divide-y divide-border">
                  <Row
                    title={t("settings.openAtLogin")}
                    description={t("settings.openAtLoginDescription")}
                  >
                    <Switch
                      checked={persisted.settings?.openAtLogin ?? false}
                      onCheckedChange={(value) => void persisted.update({ openAtLogin: value })}
                    />
                  </Row>
                  <Row
                    title={t("settings.minimizeToTray")}
                    description={t("settings.minimizeToTrayDescription")}
                  >
                    <Switch
                      checked={persisted.settings?.minimizeToTray ?? false}
                      onCheckedChange={(value) => void persisted.update({ minimizeToTray: value })}
                    />
                  </Row>
                  <Row
                    title={t("settings.hardwareAcceleration")}
                    description={t("settings.restartRequired")}
                  >
                    <Switch checked={hardware} onCheckedChange={setHardware} />
                  </Row>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => void persisted.exportDiagnostics()}>
                    {t("settings.exportDiagnostics")}
                  </Button>
                  <Button variant="ghost" onClick={() => void persisted.openLogsDirectory()}>
                    {t("settings.openLogs")}
                  </Button>
                  <Button variant="danger">{t("settings.resetPreferences")}</Button>
                </div>
              </div>
            )}

            {section === "integrations" && (
              <div>
                <h3 className="text-[15px] font-semibold">{t("settings.integrationsHeading")}</h3>
                <p className="text-[12px] text-muted-foreground">
                  {t("settings.integrationsDescription")}
                </p>

                <div className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
                      <Plug className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">Transporte externo opcional</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {t("settings.externalTransportDescription")}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium capitalize text-muted-foreground">
                      {integrations.externalTransport?.state ?? t("settings.unavailable")}
                    </span>
                  </div>
                  {integrations.externalTransport && (
                    <p className="mt-2 text-[10.5px] text-muted-foreground">
                      {integrations.externalTransport.mode === "tunnel"
                        ? t("settings.protectedTemporaryTunnel")
                        : t("settings.noActiveExternalEndpoint")}
                      {` · ${integrations.externalTransport.endpointCount} endpoint(s)`}
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                      <BaseBrandIcon provider="livepix" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">LivePix Payments</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {livepixStatus?.configured
                          ? t("settings.readyToConnect")
                          : t("settings.configureProvider")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {livepixStatus?.configured && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={livepixBusy}
                          onClick={() => void disconnectLivepix()}
                        >
                          {t("settings.disconnect")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        loading={livepixBusy}
                        onClick={() => {
                          setLivepixError(null);
                          setSetupProvider("livepix");
                        }}
                      >
                        {livepixStatus?.configured
                          ? t("settings.retryLivepix")
                          : t("settings.connect")}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#9146ff]/15">
                    <BaseBrandIcon provider="twitch" className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">Twitch Chat</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {integrations.twitchAuth?.configured
                        ? t("settings.connectedAs", { login: integrations.twitchAuth.login })
                        : integrations.twitchAuth?.available
                          ? t("settings.readyToConnect")
                          : t("settings.configureProvider")}
                    </p>
                    {integrations.twitchDevice && (
                      <p className="mt-1 text-xs font-semibold tracking-widest text-primary">
                        {t("settings.code", { code: integrations.twitchDevice.userCode })}
                      </p>
                    )}
                  </div>
                  {integrations.twitchAuth?.configured ? (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={integrations.busy}
                      onClick={() => void integrations.disconnectTwitch()}
                    >
                      {t("settings.disconnect")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      loading={integrations.busy}
                      onClick={() => setSetupProvider("twitch")}
                    >
                      {t("settings.connect")}
                    </Button>
                  )}
                </div>

                <div className="mt-3 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/15">
                      <BaseBrandIcon provider="youtube" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">YouTube Live Chat</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {integrations.youtubeAuth?.configured
                          ? t("settings.authorizedSelectActiveStream")
                          : integrations.youtubeAuth?.available
                            ? t("settings.readyToConnect")
                            : t("settings.configureProvider")}
                      </p>
                    </div>
                    {integrations.youtubeAuth?.configured ? (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={integrations.busy}
                          onClick={() => void integrations.disconnectYouTube()}
                        >
                          {t("settings.disconnect")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        loading={integrations.busy}
                        onClick={() => setSetupProvider("youtube")}
                      >
                        {t("settings.connect")}
                      </Button>
                    )}
                  </div>
                  {integrations.youtubeBroadcasts.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {integrations.youtubeBroadcasts.map((broadcast) => (
                        <div
                          key={broadcast.liveChatId}
                          className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">{broadcast.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {t("settings.activeStream")}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {t("settings.availableInLiveTab")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                        <BaseBrandIcon provider="kick" className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">Kick Chat</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {integrations.kickAuth?.configured
                            ? t("settings.readyToConnect")
                            : t("settings.configureProvider")}
                        </p>
                      </div>
                      {integrations.kickAuth?.configured ? (
                        <Button
                          size="sm"
                          variant="danger"
                          loading={integrations.busy}
                          onClick={() => void integrations.disconnectKick()}
                        >
                          {t("settings.disconnect")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          loading={integrations.busy}
                          onClick={() => setSetupProvider("kick")}
                        >
                          {t("settings.connect")}
                        </Button>
                      )}
                    </div>
                  </div>
                  {integrations.connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                    >
                      <BaseBrandIcon provider={connection.provider} className="size-5" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          {connection.channelDisplayName}
                        </p>
                        <p className="text-[11px] capitalize text-muted-foreground">
                          {brandName(connection.provider)} · {connection.status}
                        </p>
                        {connection.lastErrorCode && (
                          <p className="text-[10px] text-destructive">
                            {connection.lastErrorCode === "YOUTUBE_QUOTA_OR_PERMISSION_ERROR"
                              ? t("settings.quotaError")
                              : connection.lastErrorCode === "YOUTUBE_CHAT_ENDED"
                                ? t("settings.chatEnded")
                                : connection.lastErrorCode}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${connection.channelDisplayName}`}
                        onClick={() => void integrations.remove(connection.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  {!integrations.connections.length && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {t("settings.noChannelsRegistered")}
                    </p>
                  )}
                  {integrations.error && (
                    <p className="text-xs text-destructive">{integrations.error}</p>
                  )}
                </div>
              </div>
            )}

            {section === "updates" && (
              <div>
                <h3 className="text-[15px] font-semibold">{t("settings.updates")}</h3>
                <p className="text-[12px] text-muted-foreground">
                  {t("settings.updatesDescription")}
                </p>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)]">
                    <Download className="size-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold">{t("settings.version040")}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {checked ? t("settings.upToDate") : t("settings.lastChecked")}
                    </p>
                  </div>
                  <Button
                    loading={checking}
                    variant="secondary"
                    onClick={() => {
                      setChecking(true);
                      void persisted
                        .checkUpdates()
                        .then(() => setChecked(true))
                        .finally(() => setChecking(false));
                    }}
                  >
                    {t("settings.checkNow")}
                  </Button>
                </div>

                <div className="mt-3 divide-y divide-border">
                  <Row
                    title={t("settings.automaticUpdates")}
                    description={t("settings.automaticUpdatesDescription")}
                  >
                    <Switch checked disabled />
                  </Row>
                  <Row
                    title={t("settings.betaChannel")}
                    description={t("settings.betaChannelDescription")}
                  >
                    <Switch checked={beta} onCheckedChange={setBeta} />
                  </Row>
                </div>

                <Separator className="my-4" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("settings.whatsNew")}
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
                  <li>• {t("settings.adaptiveTeamBracket")}</li>
                  <li>• {t("settings.physicsBoxMode")}</li>
                  <li>• {t("settings.neutralBlackTheme")}</li>
                </ul>
              </div>
            )}
          </main>
        </div>
        {setupProvider && (
          <ProviderSetupWizard
            open
            provider={setupProvider}
            busy={setupProvider === "livepix" ? livepixBusy : integrations.busy}
            error={setupProvider === "livepix" ? livepixError : null}
            onOpenChange={(open) => {
              if (!open) setSetupProvider(null);
            }}
            onConnect={(credentials) => {
              if (setupProvider === "livepix" && credentials) {
                void saveLivepix(credentials);
                return;
              }
              if (setupProvider === "youtube" && credentials) {
                const saveClientId = settingsApi.saveYouTubeClientId(credentials.clientId);
                const saveSecret = credentials.clientSecret
                  ? settingsApi.saveYouTubeClientSecret(credentials.clientSecret)
                  : Promise.resolve();
                void saveSecret
                  .then(() => saveClientId)
                  .then(() => integrations.connectYouTube())
                  .finally(() => setSetupProvider(null));
                return;
              }
              if (setupProvider === "twitch" && credentials) {
                void settingsApi
                  .saveTwitchClientId(credentials.clientId)
                  .then(() => integrations.connectTwitch())
                  .finally(() => setSetupProvider(null));
                return;
              }
              if (setupProvider === "kick" && credentials) {
                void Promise.all([
                  settingsApi.saveKickClientId(credentials.clientId),
                  settingsApi.saveKickClientSecret(credentials.clientSecret),
                ])
                  .then(() => integrations.connectKick())
                  .finally(() => setSetupProvider(null));
                return;
              }
              if (setupProvider === "youtube") void integrations.connectYouTube();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
