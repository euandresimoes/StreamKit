import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BaseBrandIcon } from "@/components/base/BaseBrandIcon";
import { useTranslation } from "react-i18next";

export function PaymentCampaignDialog({
  open,
  onOpenChange,
  enabled,
  minimumAmount,
  currency,
  onChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  enabled: boolean;
  minimumAmount: string;
  currency: string;
  onChange(value: {
    livepixAutoEntry?: boolean;
    livepixCurrency?: string;
    livepixMinimum?: string;
  }): void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-w-md border-border-strong bg-popover/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BaseBrandIcon provider="livepix" className="size-5" />
            {t("live.paymentProviders")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-3">
            <div>
              <p className="text-sm font-medium">{t("live.captureConfirmedPayments")}</p>
              <p className="text-xs text-muted-foreground">
                {t("live.paymentReviewHint")}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={(value) => onChange({ livepixAutoEntry: value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              {t("live.minimumAmount")}
              <Input
                min="0.01"
                step="0.01"
                type="number"
                value={minimumAmount}
                onChange={(event) => onChange({ livepixMinimum: event.target.value })}
                aria-label={t("live.minimumPaymentAmount")}
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {t("live.currency")}
              <Input
                className="uppercase"
                maxLength={12}
                value={currency}
                onChange={(event) => onChange({ livepixCurrency: event.target.value.toUpperCase() })}
                aria-label={t("live.paymentCurrency")}
              />
            </label>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("live.campaignRules")}</p>
            <p className="mt-1">{t("live.confirmedPaymentsOnly")}</p>
          </div>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            {t("live.done")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
