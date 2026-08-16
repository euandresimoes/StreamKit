import { useState } from "react";
import { ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
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
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const isLivePix = provider === "livepix";
  const isYouTube = provider === "youtube";
  const needsClientId = isLivePix || provider === "twitch" || isYouTube || provider === "kick";

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
        <DialogTitle className="sr-only">{guide.title}</DialogTitle>
        <div className="flex min-h-0 h-full">
          <aside className="w-[210px] shrink-0 border-r border-border bg-surface-2/35 p-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <BaseBrandIcon provider={provider} className="size-5" />
              <span className="text-xs font-semibold">{guide.title}</span>
            </div>
            <div className="mt-3 space-y-1">
              {guide.steps.map((item, index) => (
                <button
                  key={item.title}
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
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </aside>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-6">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Account setup
            </p>
            <h2 className="mt-2 text-base font-semibold">{guide.steps[step]?.title}</h2>
            <p className="mt-2 max-w-[560px] whitespace-pre-line text-xs leading-5 text-muted-foreground">
              {guide.steps[step]?.description}
            </p>
            {guide.steps[step]?.imageUrl && (
              <img
                src={guide.steps[step]!.imageUrl}
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
                {guide.steps[step]!.actionLabel}
              </Button>
            )}
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Requirements
              </p>
              <div className="mt-2 space-y-1">
                {guide.requirements.map((requirement) => (
                  <p key={requirement} className="text-xs text-muted-foreground">
                    · {requirement}
                  </p>
                ))}
              </div>
            </div>
            {needsClientId && (
              <div className="mt-6 space-y-2 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <KeyRound className="size-3.5" /> Secure credentials
                </div>
                {needsClientId && (
                  <Input
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    placeholder="Client ID"
                    autoComplete="off"
                  />
                )}
                {(isLivePix || isYouTube || provider === "kick") && (
                  <Input
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                    placeholder="Client Secret"
                    type="password"
                    autoComplete="new-password"
                  />
                )}
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="size-3" /> Stored with the operating system secure
                  storage.
                </p>
              </div>
            )}
            {provider === "kick" && (redirectUrl || webhookUrl) && (
              <div className="mt-6 space-y-2 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="size-3.5" /> Kick connection URLs
                </div>
                <p className="text-[10px] leading-4 text-muted-foreground">
                  Use the redirect URL in the OAuth Redirect URL field and the webhook URL in the
                  Webhook URL field of your Kick developer application. The webhook URL is temporary
                  and must be updated after restarting StreamKit.
                </p>
                {redirectUrl && <BaseCopyField label="OAuth Redirect URL" value={redirectUrl} />}
                {webhookUrl && <BaseCopyField label="Webhook URL" value={webhookUrl} />}
              </div>
            )}
            <div className="mt-8 flex justify-between gap-2">
              <Button variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>
                    Back
                  </Button>
                )}
                {step < guide.steps.length - 1 ? (
                  <Button onClick={() => setStep((value) => value + 1)}>Next</Button>
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
                    Continue
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
