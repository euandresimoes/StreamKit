import { useEffect, useState } from "react";
import { BaseEmojiPicker } from "@/components/base/BaseEmojiPicker";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  busy: boolean;
  onOpenChange(open: boolean): void;
  onSubmit(name: string, icon: string): Promise<void> | void;
  open: boolean;
};

export function CreateWorkspaceDialog({ busy, onOpenChange, onSubmit, open }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (!open) {
      setName("");
      setIcon("📋");
      setPickerOpen(false);
    }
  }, [open]);
  const submit = async () => {
    if (!name.trim()) return;
    await onSubmit(name.trim(), icon);
    onOpenChange(false);
  };
  const selectEmoji = (emoji: string) => {
    setIcon(emoji);
    setPickerOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border-strong bg-popover/95 sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            Choose an emoji and a name. Everything is saved on this computer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-12 px-0 text-xl"
                aria-label="Escolher emoji"
              >
                {icon}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto border-0 bg-transparent p-0 shadow-none"
            >
              <BaseEmojiPicker value={icon} onSelect={selectEmoji} />
            </PopoverContent>
          </Popover>
          <Input
            autoFocus
            value={name}
            placeholder="e.g. Movies to watch"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !pickerOpen) void submit();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!name.trim()} onClick={() => void submit()}>
            Create workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
