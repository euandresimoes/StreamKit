import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { BaseDockPanel } from "@/components/base/BaseDockPanel";

export function LiveQuickControlsPanel({ connected }: { connected: boolean }) {
  const { t } = useTranslation();
  return (
    <BaseDockPanel
      panelId="live-quick-controls"
      title={t("settings.quickControls")}
      icon={SlidersHorizontal}
    >
      <div className="grid w-full content-start gap-2 p-3">
        <Button size="sm" variant="outline" disabled={!connected}>
          {t("settings.startStream")}
        </Button>
        <Button size="sm" variant="outline" disabled={!connected}>
          {t("settings.refreshData")}
        </Button>
        <p className="text-[10px] text-muted-foreground">
          {connected
            ? t("settings.providerActionsAvailable")
            : t("settings.connectPlatformForActions")}
        </p>
      </div>
    </BaseDockPanel>
  );
}
