import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import i18n from "@/i18n";

export type QuickSettingsProvider = "livepix" | "twitch" | "youtube" | "kick";

type CredentialValues = {
  clientId: string;
  clientSecret?: string;
};

export function ProviderQuickSettings({
  provider,
  saving,
  onSave,
}: {
  provider: QuickSettingsProvider;
  saving?: boolean;
  onSave: (values: CredentialValues) => Promise<void>;
}) {
  const { t } = useTranslation(undefined, { i18n });
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const hasSecret = provider !== "twitch";

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] text-muted-foreground">
          <span className="block font-semibold text-foreground">{t("settings.clientId")}</span>
          <Input
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder={t("settings.leaveBlankToKeep")}
            autoComplete="off"
          />
        </label>
        {hasSecret && (
          <label className="space-y-1 text-[11px] text-muted-foreground">
            <span className="block font-semibold text-foreground">
              {t("settings.clientSecret")}
            </span>
            <Input
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder={t("settings.leaveBlankToKeep")}
              autoComplete="new-password"
            />
          </label>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          loading={saving ?? false}
          disabled={!clientId.trim() && (!hasSecret || !clientSecret.trim())}
          onClick={() =>
            void onSave({
              clientId: clientId.trim(),
              ...(hasSecret ? { clientSecret: clientSecret.trim() } : {}),
            })
          }
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
