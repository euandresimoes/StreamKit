import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BaseDockPanel } from "@/components/base/BaseDockPanel";

export function LiveActivityPanel({ connected }: { connected: boolean }) {
  const { t } = useTranslation();
  return (
    <BaseDockPanel panelId="live-activity" title={t("live.activity")} icon={Activity}>
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
        {connected ? t("live.noRecentEvents") : t("live.streamEventsWaiting")}
      </div>
    </BaseDockPanel>
  );
}
