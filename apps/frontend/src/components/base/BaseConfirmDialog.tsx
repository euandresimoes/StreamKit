import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  busy?: boolean;
  description: string;
  onConfirm(): void | Promise<void>;
  onOpenChange(open: boolean): void;
  open: boolean;
  title: string;
};

export function BaseConfirmDialog({
  busy = false,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
}: Props) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-panel border-border-strong bg-popover/95">
        <AlertDialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" loading={busy} onClick={() => void onConfirm()}>
            {t("common.confirmDeletion")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
