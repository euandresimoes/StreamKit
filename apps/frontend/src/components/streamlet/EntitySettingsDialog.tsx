import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { BaseConfirmDialog } from "@/components/base/BaseConfirmDialog";
import { BaseSegmentedControl } from "@/components/base/BaseSegmentedControl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  busy: boolean;
  description?: string | null;
  deleteTitle?: string;
  entityLabel: string;
  title?: string;
  mode?: "wheel" | "case-opening";
  maxParticipants?: number;
  name: string;
  onDelete(): Promise<void> | void;
  onOpenChange(open: boolean): void;
  onSave(input: {
    description: string | null;
    mode?: "wheel" | "case-opening";
    maxParticipants?: number;
    name: string;
  }): Promise<unknown> | unknown;
  open: boolean;
};

export function EntitySettingsDialog(props: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(props.name);
  const [description, setDescription] = useState(props.description ?? "");
  const [mode, setMode] = useState(props.mode);
  const [maxParticipants, setMaxParticipants] = useState(props.maxParticipants ?? 10000);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (props.open) {
      setName(props.name);
      setDescription(props.description ?? "");
      setMode(props.mode);
      setMaxParticipants(props.maxParticipants ?? 10000);
    }
  }, [props.open, props.name, props.description, props.mode, props.maxParticipants]);
  const save = async () => {
    if (!name.trim()) return;
    const result = await props.onSave({
      name: name.trim(),
      description: description.trim() || null,
      ...(mode ? { mode } : {}),
      ...(props.maxParticipants !== undefined ? { maxParticipants } : {}),
    });
    if (result !== undefined) props.onOpenChange(false);
  };
  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="glass-panel border-border-strong bg-popover/95">
          <DialogHeader>
            <DialogTitle>{props.title ?? `Configure ${props.entityLabel}`}</DialogTitle>
            <DialogDescription>{t("entity.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("entity.namePlaceholder")}
            />
            {props.description !== undefined && (
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("entity.descriptionPlaceholder")}
              />
            )}
            {props.maxParticipants !== undefined && (
              <label className="space-y-1.5 text-xs font-medium">
                <span>{t("entity.maxParticipants")}</span>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxParticipants}
                  onChange={(event) => setMaxParticipants(Number(event.target.value))}
                />
              </label>
            )}
            {mode && (
              <BaseSegmentedControl
                ariaLabel="Giveaway type"
                value={mode}
                onChange={(value) => setMode(value as "wheel" | "case-opening")}
                options={
                  [
                    { label: t("giveaway.wheel"), value: "wheel" },
                    { label: t("giveaway.box"), value: "case-opening" },
                  ] as const
                }
              />
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 /> {t("common.delete")}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                loading={props.busy}
                disabled={!name.trim() || maxParticipants < 1 || maxParticipants > 10000}
                onClick={() => void save()}
              >
                {t("common.save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BaseConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        busy={props.busy}
        title={props.deleteTitle ?? `Delete ${props.entityLabel}?`}
        description={t("entity.permanentDeleteDescription")}
        onConfirm={async () => {
          await props.onDelete();
          setConfirming(false);
          props.onOpenChange(false);
        }}
      />
    </>
  );
}
