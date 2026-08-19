import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Download,
  MonitorCog,
  Palette,
  Plug,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Locale } from "@streamlet/contracts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BaseBrandIcon, brandName } from "@/components/base/BaseBrandIcon";
import { BaseBadge } from "@/components/base/BaseBadge";
import { BaseCopyField } from "@/components/base/BaseCopyField";
import { useIntegrations } from "@/modules/integration/use-integrations";
import { useSettings } from "@/modules/settings/use-settings";
import { useGuideOpen } from "@/modules/guide/guide-state";
import { GUIDE_CLOSE_MODALS_EVENT } from "@/modules/guide/guide-state";
import { settingsApi } from "@/modules/settings/settings-api";
import i18n from "@/i18n";
import { ProviderSetupWizard } from "./provider-guides/ProviderSetupWizard";
import type { ProviderGuideId } from "./provider-guides/types";
import { ProviderQuickSettings, type QuickSettingsProvider } from "./ProviderQuickSettings";

type Section =
  | "settings-tab-appearance"
  | "settings-tab-system"
  | "settings-tab-integrations"
  | "settings-tab-updates";

const nav: { id: Section; labelKey: string; icon: typeof Palette; hintKey: string }[] = [
  {
    id: "settings-tab-appearance",
    labelKey: "settings.appearance",
    icon: Palette,
    hintKey: "settings.appearanceHint",
  },
  {
    id: "settings-tab-system",
    labelKey: "settings.system",
    icon: MonitorCog,
    hintKey: "settings.systemHint",
  },
  {
    id: "settings-tab-integrations",
    labelKey: "settings.integrations",
    icon: Plug,
    hintKey: "settings.integrationsHint",
  },
  {
    id: "settings-tab-updates",
    labelKey: "settings.updates",
    icon: RefreshCw,
    hintKey: "settings.version",
  },
];

const themes = [
  { id: "dark" as const, labelKey: "settings.dark", swatch: "oklch(0.12 0 0)" },
  { id: "light" as const, labelKey: "settings.light", swatch: "oklch(0.97 0.004 75)" },
] as const;

const languages: { value: Locale; labelKey: string }[] = [
  { value: "en-US", labelKey: "guide.languageEnglish" },
  { value: "pt-BR", labelKey: "guide.languagePortuguese" },
  { value: "es", labelKey: "guide.languageSpanish" },
];

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
  const guideOpen = useGuideOpen();
  useEffect(() => {
    const close = () => onOpenChange(false);
    window.addEventListener(GUIDE_CLOSE_MODALS_EVENT, close);
    return () => window.removeEventListener(GUIDE_CLOSE_MODALS_EVENT, close);
  }, [onOpenChange]);
  const [section, setSection] = useState<Section>("settings-tab-appearance");
  const [hardware, setHardware] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [beta, setBeta] = useState(false);
  const [livepixStatus, setLivepixStatus] = useState<Awaited<
    ReturnType<typeof settingsApi.livepixStatus>
  > | null>(null);
  const [livepixBusy, setLivepixBusy] = useState(false);
  const [livepixError, setLivepixError] = useState<string | null>(null);
  const [livepixWebhookUrl, setLivepixWebhookUrl] = useState<string | null>(null);
  const [livepixPreparing, setLivepixPreparing] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<QuickSettingsProvider | null>(null);
  const [savingProvider, setSavingProvider] = useState<QuickSettingsProvider | null>(null);
  const [setupProvider, setSetupProvider] = useState<ProviderGuideId | null>(null);
  const { t } = useTranslation(undefined, { i18n });
  const persisted = useSettings(open);
  const integrations = useIntegrations(open && section === "settings-tab-integrations");
  const { prepareKickAuth } = integrations;
  const theme = persisted.settings?.theme ?? "dark";
  const locale = persisted.settings?.locale ?? "en-US";
  useEffect(() => {
    if (open && section === "settings-tab-integrations")
      void settingsApi
        .livepixStatus()
        .then(setLivepixStatus)
        .catch(() => undefined);
  }, [open, section]);
  useEffect(() => {
    if (setupProvider === "kick") void prepareKickAuth();
  }, [prepareKickAuth, setupProvider]);
  useEffect(() => {
    if (setupProvider !== "livepix") return;
    setLivepixPreparing(true);
    void settingsApi
      .prepareLivepixWebhook()
      .then((result) => setLivepixWebhookUrl(result.callbackUrl))
      .catch((cause) =>
        setLivepixError(cause instanceof Error ? cause.message : "Could not prepare LivePix."),
      )
      .finally(() => setLivepixPreparing(false));
  }, [setupProvider]);
  const saveLivepix = async (credentials: { clientId: string; clientSecret: string }) => {
    setLivepixBusy(true);
    setLivepixError(null);
    try {
      await settingsApi.saveCredential(JSON.stringify(credentials));
      setLivepixStatus(await settingsApi.connectLivepix());
      await integrations.reload();
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
      await integrations.reload();
    } catch (cause) {
      setLivepixError(cause instanceof Error ? cause.message : "Could not disconnect LivePix.");
    } finally {
      setLivepixBusy(false);
    }
  };

  const saveProviderCredentials = async (
    provider: QuickSettingsProvider,
    values: { clientId: string; clientSecret?: string },
  ) => {
    setSavingProvider(provider);
    try {
      if (provider === "livepix") {
        if (!values.clientId || !values.clientSecret)
          throw new Error(t("settings.credentialsPairRequired"));
        await settingsApi.saveCredential(
          JSON.stringify({ clientId: values.clientId, clientSecret: values.clientSecret }),
        );
        setLivepixStatus(await settingsApi.livepixStatus());
        await integrations.reload();
      } else {
        if (values.clientId) {
          if (provider === "twitch") await settingsApi.saveTwitchClientId(values.clientId);
          if (provider === "youtube") await settingsApi.saveYouTubeClientId(values.clientId);
          if (provider === "kick") await settingsApi.saveKickClientId(values.clientId);
        }
        if (values.clientSecret) {
          if (provider === "youtube")
            await settingsApi.saveYouTubeClientSecret(values.clientSecret);
          if (provider === "kick") await settingsApi.saveKickClientSecret(values.clientSecret);
        }
      }
    } catch (cause) {
      setLivepixError(cause instanceof Error ? cause.message : t("errors.saveSettings"));
    } finally {
      setSavingProvider(null);
    }
  };

  const toggleQuickSettings = (provider: QuickSettingsProvider) => {
    setLivepixError(null);
    setExpandedProvider((current) => (current === provider ? null : provider));
  };

  const quickSettings = (provider: QuickSettingsProvider, connected: boolean) =>
    connected && (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-expanded={expandedProvider === provider}
        aria-label={t("settings.configureProvider")}
        title={t("settings.configureProvider")}
        onClick={() => toggleQuickSettings(provider)}
      >
        <Settings2 className="size-4" />
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!guideOpen}>
      <DialogContent
        id="settings-menu-modal"
        onPointerDownOutside={(event) => {
          if (document.body.dataset["streamletGuideOpen"] === "true") {
            event.preventDefault();
          } else {
            onOpenChange(false);
          }
        }}
        className="glass-panel h-[min(720px,calc(100vh-2rem))] w-[min(960px,calc(100vw-2rem))] max-w-none gap-0 overflow-hidden rounded-3xl border-border-strong bg-popover/95 !p-0"
      >
        <DialogTitle className="sr-only">{t("settings.title")}</DialogTitle>

        <div className="flex h-full min-h-0">
          {/* Aside */}
          <aside
            id="settings-menu-modal-aside"
            className="min-h-0 w-[220px] shrink-0 overflow-y-auto border-r border-border bg-surface-2/40 p-3"
          >
            <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("settings.title")}
            </p>
            <nav className="flex flex-col gap-0.5">
              {nav.map((n) => (
                <button
                  id={n.id}
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
                    <span className="block text-[10.5px] opacity-70">
                      {n.id === "settings-tab-updates"
                        ? persisted.updateState?.status === "available"
                          ? t("settings.updateAvailable", {
                              version: persisted.updateState.available?.version,
                            })
                          : persisted.updateState?.status === "downloading"
                            ? t("settings.downloading", {
                                progress: Math.round(persisted.updateState.progress ?? 0),
                              })
                            : persisted.updateState?.status === "downloaded"
                              ? t("settings.readyToInstall")
                              : persisted.updateState?.status === "up-to-date"
                                ? t("settings.upToDate")
                                : t("settings.notChecked")
                        : t(n.hintKey)}
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Panel */}
          <main
            id="settings-menu-modal-main"
            key={section}
            className="animate-sk-in min-h-0 min-w-0 flex-1 overflow-y-auto p-6"
          >
            {section === "settings-tab-appearance" && (
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
                <Row title={t("settings.language")} description={t("settings.languageDescription")}>
                  <Select
                    value={locale}
                    onValueChange={(value) => {
                      const nextLocale = value as Locale;
                      void i18n.changeLanguage(nextLocale);
                      void persisted.update({ locale: nextLocale });
                    }}
                  >
                    <SelectTrigger className="w-40" aria-label={t("settings.language")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language.value} value={language.value}>
                          {t(language.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            {section === "settings-tab-system" && (
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

            {section === "settings-tab-integrations" && (
              <div>
                <h3 className="text-[15px] font-semibold">{t("settings.integrationsHeading")}</h3>
                <p className="text-[12px] text-muted-foreground">
                  {t("settings.integrationsDescription")}
                </p>

                <div className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-4">
                  <div className="mb-3">
                    <p className="text-[13px] font-semibold">{t("settings.externalEndpoints")}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {t("settings.externalEndpointsDescription")}
                    </p>
                  </div>
                  {integrations.externalTransport?.publicUrl ? (
                    <div className="space-y-3">
                      <BaseCopyField
                        label={t("settings.publicUrl")}
                        value={integrations.externalTransport.publicUrl}
                      />
                      {integrations.externalTransport.webhookUrls.kick && (
                        <BaseCopyField
                          label={t("settings.kickWebhookUrl")}
                          value={integrations.externalTransport.webhookUrls.kick}
                        />
                      )}
                      {integrations.externalTransport.webhookUrls.livepix && (
                        <BaseCopyField
                          label={t("settings.livepixWebhookUrl")}
                          value={integrations.externalTransport.webhookUrls.livepix}
                        />
                      )}
                      {integrations.externalTransport.webhookUrls.twitch && (
                        <BaseCopyField
                          label={t("settings.twitchWebhookUrl")}
                          value={integrations.externalTransport.webhookUrls.twitch}
                        />
                      )}
                      {integrations.externalTransport.webhookUrls.youtube && (
                        <BaseCopyField
                          label={t("settings.youtubeWebhookUrl")}
                          value={integrations.externalTransport.webhookUrls.youtube}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-muted-foreground">
                      {t("settings.noExternalEndpoint")}
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                      <BaseBrandIcon provider="livepix" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold">{t("settings.livepixPayments")}</p>
                        <BaseBadge variant="danger">{t("settings.reconfigureOnRestart")}</BaseBadge>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground">
                        {livepixStatus?.configured
                          ? t("settings.connected")
                          : t("settings.configureProvider")}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {quickSettings("livepix", livepixStatus?.state === "ready")}
                      {livepixStatus?.state === "ready" && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={livepixBusy}
                          onClick={() => void disconnectLivepix()}
                        >
                          {t("settings.disconnect")}
                        </Button>
                      )}
                      {livepixStatus?.state !== "ready" && (
                        <Button
                          variant="secondary"
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
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-[11.5px] text-red-300/80">
                    {t("settings.reconfigureOnRestartDescription")}
                  </p>
                  {expandedProvider === "livepix" && (
                    <ProviderQuickSettings
                      provider="livepix"
                      saving={savingProvider === "livepix"}
                      onSave={(values) => saveProviderCredentials("livepix", values)}
                    />
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#9146ff]/15">
                    <BaseBrandIcon provider="twitch" className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">{t("settings.twitchChat")}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">
                      {integrations.twitchAuth?.configured
                        ? t("settings.connectedAs", { login: integrations.twitchAuth.login })
                        : t("settings.configureProvider")}
                    </p>
                    {integrations.twitchDevice && (
                      <p className="mt-1 text-xs font-semibold tracking-widest text-primary">
                        {t("settings.code", { code: integrations.twitchDevice.userCode })}
                      </p>
                    )}
                  </div>
                  {integrations.twitchAuth?.configured ? (
                    <>
                      {quickSettings("twitch", true)}
                      <Button
                        variant="danger"
                        size="sm"
                        loading={integrations.busy}
                        onClick={() => void integrations.disconnectTwitch()}
                      >
                        {t("settings.disconnect")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={integrations.busy}
                      onClick={() => setSetupProvider("twitch")}
                    >
                      {t("settings.connect")}
                    </Button>
                  )}
                </div>
                {expandedProvider === "twitch" && integrations.twitchAuth?.configured && (
                  <ProviderQuickSettings
                    provider="twitch"
                    saving={savingProvider === "twitch"}
                    onSave={(values) => saveProviderCredentials("twitch", values)}
                  />
                )}

                <div className="mt-3 rounded-2xl border border-border bg-surface-2/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/15">
                      <BaseBrandIcon provider="youtube" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">{t("settings.youtubeLiveChat")}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {integrations.youtubeAuth?.configured
                          ? t("settings.authorizedSelectActiveStream")
                          : t("settings.configureProvider")}
                      </p>
                    </div>
                    {integrations.youtubeAuth?.configured ? (
                      <>
                        {quickSettings("youtube", true)}
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
                        variant="secondary"
                        size="sm"
                        loading={integrations.busy}
                        onClick={() => setSetupProvider("youtube")}
                      >
                        {t("settings.connect")}
                      </Button>
                    )}
                  </div>
                  {expandedProvider === "youtube" && integrations.youtubeAuth?.configured && (
                    <ProviderQuickSettings
                      provider="youtube"
                      saving={savingProvider === "youtube"}
                      onSave={(values) => saveProviderCredentials("youtube", values)}
                    />
                  )}
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
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold">{t("settings.kickChat")}</p>
                          <BaseBadge variant="danger">
                            {t("settings.reconfigureOnRestart")}
                          </BaseBadge>
                        </div>
                        <p className="text-[11.5px] text-muted-foreground">
                          {integrations.kickAuth?.configured
                            ? t("settings.connected")
                            : t("settings.configureProvider")}
                        </p>
                      </div>
                      {integrations.kickAuth?.configured ? (
                        <>
                          {quickSettings("kick", true)}
                          <Button
                            size="sm"
                            variant="danger"
                            loading={integrations.busy}
                            onClick={() => void integrations.disconnectKick()}
                          >
                            {t("settings.disconnect")}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={integrations.busy}
                          onClick={() => setSetupProvider("kick")}
                        >
                          {t("settings.connect")}
                        </Button>
                      )}
                    </div>
                    <p className="mt-3 text-[11.5px] text-red-300/80">
                      {t("settings.reconfigureOnRestartDescription")}
                    </p>
                    {expandedProvider === "kick" && integrations.kickAuth?.configured && (
                      <ProviderQuickSettings
                        provider="kick"
                        saving={savingProvider === "kick"}
                        onSave={(values) => saveProviderCredentials("kick", values)}
                      />
                    )}
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
                  {integrations.error && (
                    <p className="text-xs text-destructive">{integrations.error}</p>
                  )}
                  {livepixError && <p className="text-xs text-destructive">{livepixError}</p>}
                </div>
              </div>
            )}

            {section === "settings-tab-updates" && (
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
                    <p className="text-[13px] font-semibold">
                      {persisted.updateState?.available?.title ??
                        t("settings.version", { version: persisted.appVersion || "—" })}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {persisted.updateState?.status === "available"
                        ? t("settings.updateAvailable", {
                            version: persisted.updateState.available?.version,
                          })
                        : persisted.updateState?.status === "downloading"
                          ? t("settings.downloading", {
                              progress: Math.round(persisted.updateState.progress ?? 0),
                            })
                          : persisted.updateState?.status === "downloaded"
                            ? t("settings.readyToInstall")
                            : persisted.updateState?.status === "error"
                              ? t("settings.updateCheckFailed")
                              : persisted.updateState?.status === "up-to-date" || checked
                                ? t("settings.upToDate")
                                : t("settings.notChecked")}
                    </p>
                  </div>
                  <Button
                    loading={checking || persisted.updateState?.status === "checking"}
                    variant="secondary"
                    onClick={() => {
                      if (persisted.updateState?.status === "available") {
                        void persisted.downloadUpdate();
                        return;
                      }
                      if (persisted.updateState?.status === "downloaded") {
                        void persisted.installUpdate();
                        return;
                      }
                      setChecking(true);
                      void persisted
                        .checkUpdates()
                        .then((state) => {
                          setChecked(true);
                          return state;
                        })
                        .finally(() => setChecking(false));
                    }}
                  >
                    {persisted.updateState?.status === "available"
                      ? t("settings.downloadUpdate")
                      : persisted.updateState?.status === "downloaded"
                        ? t("settings.installUpdate")
                        : t("settings.checkNow")}
                  </Button>
                  {persisted.updateState?.status === "available" && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        void persisted.skipUpdate(persisted.updateState!.available!.version)
                      }
                    >
                      {t("settings.skipUpdate")}
                    </Button>
                  )}
                </div>

                {persisted.updateState?.status === "available" &&
                  persisted.localizedReleaseNotes && (
                    <div className="mt-3 rounded-2xl border border-border bg-surface-2/40 p-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("settings.releaseNotes")}
                      </p>
                      <div className="whitespace-pre-wrap text-[12px] text-muted-foreground">
                        {persisted.localizedReleaseNotes}
                      </div>
                    </div>
                  )}

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
                <div className="mt-2 whitespace-pre-wrap text-[12px] text-muted-foreground">
                  {persisted.localizedReleaseNotes || t("settings.noReleaseNotes")}
                </div>
              </div>
            )}
          </main>
        </div>
        {setupProvider && (
          <ProviderSetupWizard
            open
            provider={setupProvider}
            busy={setupProvider === "livepix" ? livepixBusy || livepixPreparing : integrations.busy}
            error={setupProvider === "livepix" ? livepixError : integrations.error}
            onOpenChange={(open) => {
              if (!open) setSetupProvider(null);
            }}
            webhookUrl={
              setupProvider === "kick"
                ? (integrations.kickFlow?.webhookUrl ?? integrations.kickSetup?.webhookUrl ?? null)
                : setupProvider === "livepix"
                  ? livepixWebhookUrl
                  : null
            }
            redirectUrl={
              setupProvider === "kick"
                ? (integrations.kickFlow?.redirectUrl ??
                  integrations.kickSetup?.redirectUrl ??
                  null)
                : null
            }
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
                ]).then(() => integrations.connectKick());
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
