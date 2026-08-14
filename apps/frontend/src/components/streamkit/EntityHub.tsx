import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EntityHub({
  items,
  icon: Icon,
  label,
  onCreate,
  onSelect,
}: {
  items: Array<{ id: string; name: string; description?: string | null }>;
  icon: typeof Plus;
  label: string;
  onCreate(): void;
  onSelect(id: string): void;
}) {
  const [query, setQuery] = useState("");
  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
    [items, query],
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
      <header className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 pl-9"
            placeholder={`Buscar ${label.toLowerCase()}`}
            aria-label={`Buscar ${label.toLowerCase()}`}
          />
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus /> Novo {label.toLowerCase()}
        </Button>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto pt-6">
        {visibleItems.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="raise group flex min-h-28 flex-col items-start rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-border-strong hover:bg-accent/40"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="mt-4 line-clamp-2 text-sm font-semibold">{item.name}</span>
                {item.description && (
                  <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {item.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Icon className="size-9" />
            <p className="text-sm">
              {items.length
                ? "Nenhum resultado encontrado."
                : `Nenhum ${label.toLowerCase()} criado.`}
            </p>
            <Button variant="secondary" size="sm" onClick={onCreate}>
              <Plus /> Criar primeiro
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
