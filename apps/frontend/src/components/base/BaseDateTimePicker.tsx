import { CalendarDays, Clock3, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type BaseDateTimePickerProps = {
  ariaLabel: string;
  placeholder: string;
  value: string;
  onChange(value: string): void;
};

export function BaseDateTimePicker({
  ariaLabel,
  placeholder,
  value,
  onChange,
}: BaseDateTimePickerProps) {
  const selected = parseLocalDateTime(value);
  const hours = selected ? pad(selected.getHours()) : "00";
  const minutes = selected ? pad(selected.getMinutes()) : "00";

  const updateDate = (date: Date | undefined) => {
    if (!date) return;
    date.setHours(Number(hours), Number(minutes), 0, 0);
    onChange(toLocalDateTime(date));
  };
  const updateTime = (nextHours: string, nextMinutes: string) => {
    const date = selected ?? new Date();
    date.setHours(Number(nextHours), Number(nextMinutes), 0, 0);
    onChange(toLocalDateTime(date));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          aria-label={ariaLabel}
          className={cn(
            "h-8 min-w-0 justify-start gap-2 px-2 text-[11px] font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="truncate">
            {selected
              ? selected.toLocaleString("en-US", {
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                })
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={updateDate}
          captionLayout="dropdown"
          startMonth={new Date(new Date().getFullYear() - 1, 0)}
          endMonth={new Date(new Date().getFullYear() + 3, 11)}
        />
        <div className="flex items-center gap-2 border-t border-border px-2 pt-2">
          <Clock3 className="size-3.5 text-muted-foreground" />
          <TimeSelect
            ariaLabel={`${ariaLabel}: hora`}
            value={hours}
            options={24}
            onChange={(next) => updateTime(next, minutes)}
          />
          <span className="text-muted-foreground">:</span>
          <TimeSelect
            ariaLabel={`${ariaLabel}: minuto`}
            value={minutes}
            options={60}
            step={5}
            onChange={(next) => updateTime(hours, next)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label={`Clear ${ariaLabel.toLocaleLowerCase("en-US")}`}
            disabled={!value}
            onClick={() => onChange("")}
          >
            <X />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeSelect({
  ariaLabel,
  value,
  options,
  step = 1,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: number;
  step?: number;
  onChange(value: string): void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-ring"
    >
      {Array.from({ length: Math.ceil(options / step) }, (_, index) => pad(index * step)).map(
        (item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ),
      )}
    </select>
  );
}

function parseLocalDateTime(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toLocalDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
