import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
import { BaseSegmentedControl } from "@/components/base/BaseSegmentedControl";

type CreateItemDialogProps = {
  busy?: boolean;
  children?: ReactNode;
  description: string;
  label: string;
  onOpenChange(open: boolean): void;
  onSubmit(value: string, option?: string): Promise<void> | void;
  options?: Array<{ label: string; value: string }>;
  open: boolean;
  placeholder: string;
  submitDisabled?: boolean;
  title: string;
};

export function CreateItemDialog(props: CreateItemDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [option, setOption] = useState(props.options?.[0]?.value);
  useEffect(() => {
    if (!props.open) setValue("");
  }, [props.open]);

  const submit = async () => {
    const normalized = value.trim();
    if (!normalized) return;
    await props.onSubmit(normalized, option);
    props.onOpenChange(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="glass-panel border-border-strong bg-popover/95 sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          placeholder={props.placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
        {props.children}
        {props.options && option && (
          <BaseSegmentedControl
            ariaLabel={`${props.title}: tipo`}
            value={option}
            options={props.options}
            disabled={props.busy ?? false}
            onChange={setOption}
          />
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            loading={props.busy ?? false}
            disabled={!value.trim() || props.submitDisabled}
            onClick={() => void submit()}
          >
            {props.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
