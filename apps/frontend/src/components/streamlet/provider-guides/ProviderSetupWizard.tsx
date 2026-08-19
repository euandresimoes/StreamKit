import { useState } from "react";
import { ExternalLink, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { BaseCopyField } from "@/components/base/BaseCopyField";
import { cn } from "@/lib/utils";
import { livePixSetupGuide } from "./livepix/LivePixSetupGuide";
import { twitchSetupGuide } from "./twitch/TwitchSetupGuide";
import { youtubeSetupGuide } from "./youtube/YouTubeSetupGuide";
import { kickSetupGuide } from "./kick/KickSetupGuide";
import i18n from "@/i18n";
import type { ProviderGuide, ProviderGuideId } from "./types";

const guides: Record<ProviderGuideId, ProviderGuide> = {
  livepix: livePixSetupGuide,
  twitch: twitchSetupGuide,
  youtube: youtubeSetupGuide,
  kick: kickSetupGuide,
};

export function ProviderSetupWizard({
  open,
  onOpenChange,
  provider,
  busy = false,
  error,
  onConnect,
  webhookUrl,
  redirectUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ProviderGuideId;
  busy?: boolean;
  error?: string | null;
  onConnect: (credentials?: { clientId: string; clientSecret: string }) => void;
  webhookUrl?: string | null;
  redirectUrl?: string | null;
}) {
  const guide = guides[provider];
  const { t } = useTranslation(undefined, { i18n });
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const isLivePix = provider === "livepix";
  const isYouTube = provider === "youtube";
  const needsClientId = isLivePix || provider === "twitch" || isYouTube || provider === "kick";
  const preparingTunnel = (provider === "kick" || provider === "livepix") && busy && !webhookUrl;

  const close = (value: boolean) => {
    if (!value) {
      setStep(0);
      setClientId("");
      setClientSecret("");
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="glass-panel h-[min(680px,calc(100vh-2rem))] w-[min(760px,calc(100vw-2rem))] max-w-none gap-0 overflow-hidden rounded-3xl border-border-strong bg-popover/95 p-0">
        <DialogTitle className="sr-only">{t(guide.titleKey)}</DialogTitle>
        <div className="flex min-h-0 h-full">
          <aside className="w-[210px] shrink-0 border-r border-border bg-surface-2/35 p-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <BaseBrandIcon provider={provider} className="size-5" />
              <span className="text-xs font-semibold">{t(guide.titleKey)}</span>
            </div>
            <div className="mt-3 space-y-1">
              {guide.steps.map((item, index) => (
                <button
                  key={item.titleKey}
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-[11px]",
                    step === index
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="mt-0.5 font-mono text-[10px]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{t(item.titleKey)}</span>
                </button>
              ))}
            </div>
          </aside>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {t("providerGuide.accountSetup")}
            </p>
            <h2 className="mt-2 text-base font-semibold">
              {t(guide.steps[step]?.titleKey ?? "common.loading")}
            </h2>
            <p className="mt-2 max-w-[560px] whitespace-pre-line text-xs leading-5 text-muted-foreground">
              {t(guide.steps[step]?.descriptionKey ?? "common.loading")}
            </p>
            {guide.steps[step]?.imageUrl && (
              <img
                src={guide.steps[step]!.imageUrl.replace(/^\//, "./")}
                alt=""
                className="mt-4 block h-auto w-full rounded-md border border-border"
              />
            )}
            {guide.steps[step]?.actionUrl && (
              <Button
                className="mt-4"
                variant="secondary"
                size="sm"
                onClick={() =>
                  window.open(guide.steps[step]!.actionUrl, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="size-3.5" />
                {t(guide.steps[step]!.actionLabelKey ?? "common.next")}
              </Button>
            )}
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("providerGuide.requirements")}
              </p>
              <div className="mt-2 space-y-1">
                {guide.requirementKeys.map((requirementKey) => (
                  <p key={requirementKey} className="text-xs text-muted-foreground">
                    · {t(requirementKey)}
                  </p>
                ))}
              </div>
            </div>
            {provider === "kick" && (redirectUrl || webhookUrl) && (
              <div className="mt-6 space-y-2 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="size-3.5" /> {t("providerGuide.kickUrlsTitle")}
                </div>
                <p className="text-[10px] leading-4 text-muted-foreground">
                  {t("providerGuide.kickUrlsDescription")}
                </p>
                {redirectUrl && (
                  <BaseCopyField label={t("providerGuide.oauthRedirectUrl")} value={redirectUrl} />
                )}
                {webhookUrl && (
                  <BaseCopyField label={t("providerGuide.webhookUrl")} value={webhookUrl} />
                )}
              </div>
            )}
            {provider === "livepix" && webhookUrl && (
              <div className="mt-6 space-y-2 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="size-3.5" /> {t("providerGuide.livepixNotificationTitle")}
                </div>
                <p className="text-[10px] leading-4 text-muted-foreground">
                  {t("providerGuide.livepixNotificationDescription")}
                </p>
                <BaseCopyField label={t("providerGuide.notificationUrl")} value={webhookUrl} />
              </div>
            )}
            {preparingTunnel && (
              <div
                className="mt-6 flex items-center gap-3 rounded-md border border-border bg-surface-2/30 px-3 py-3 text-xs text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <LoaderCircle className="size-4 animate-spin text-primary" />
                <span>{t("settings.preparingExternalTunnel")}</span>
              </div>
            )}
            {needsClientId && (
              <div className="mt-6 space-y-2 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <KeyRound className="size-3.5" /> {t("providerGuide.secureCredentials")}
                </div>
                {needsClientId && (
                  <Input
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    placeholder={t("settings.clientId")}
                    autoComplete="off"
                  />
                )}
                {(isLivePix || isYouTube || provider === "kick") && (
                  <Input
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                    placeholder={t("settings.clientSecret")}
                    type="password"
                    autoComplete="new-password"
                  />
                )}
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="size-3" /> {t("providerGuide.secureStorage")}
                </p>
              </div>
            )}
            <div className="mt-8 flex justify-between gap-2">
              <Button variant="ghost" onClick={() => close(false)}>
                {t("common.cancel")}
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>
                    Back
                  </Button>
                )}
                {step < guide.steps.length - 1 ? (
                  <Button onClick={() => setStep((value) => value + 1)}>{t("common.next")}</Button>
                ) : (
                  <Button
                    disabled={
                      busy ||
                      !clientId.trim() ||
                      ((isLivePix || provider === "kick") && !clientSecret)
                    }
                    loading={busy}
                    onClick={() =>
                      onConnect(
                        needsClientId ? { clientId: clientId.trim(), clientSecret } : undefined,
                      )
                    }
                  >
                    {t("common.continue")}
                  </Button>
                )}
              </div>
            </div>
            {error && (
              <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                {error}
              </p>
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
