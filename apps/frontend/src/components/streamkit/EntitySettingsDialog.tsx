import { useEffect, useState } from "react";
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
  entityLabel: string;
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
            <DialogTitle>Configurar {props.entityLabel}</DialogTitle>
            <DialogDescription>Altere as informações ou exclua permanentemente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome"
            />
            {props.description !== undefined && (
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição"
              />
            )}
            {props.maxParticipants !== undefined && (
              <label className="space-y-1.5 text-xs font-medium">
                <span>Máximo de participantes</span>
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
                ariaLabel="Tipo de sorteio"
                value={mode}
                onChange={(value) => setMode(value as "wheel" | "case-opening")}
                options={
                  [
                    { label: "Roleta", value: "wheel" },
                    { label: "Caixa", value: "case-opening" },
                  ] as const
                }
              />
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 /> Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                loading={props.busy}
                disabled={!name.trim() || maxParticipants < 1 || maxParticipants > 10000}
                onClick={() => void save()}
              >
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BaseConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        busy={props.busy}
        title={`Excluir ${props.entityLabel}?`}
        description="Esta ação é permanente e removerá também todo o conteúdo e histórico relacionados."
        onConfirm={async () => {
          await props.onDelete();
          setConfirming(false);
          props.onOpenChange(false);
        }}
      />
    </>
  );
}
