import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EntitySelectProps = {
  items: Array<{ id: string; name: string }>;
  label: string;
  onChange(id: string): void;
  value: string | undefined;
};

export function EntitySelect({ items, label, onChange, value }: EntitySelectProps) {
  return (
    <Select {...(value === undefined ? {} : { value })} onValueChange={onChange}>
      <SelectTrigger className="w-36 text-left" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent align="end" sideOffset={6}>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
