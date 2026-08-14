import type { LiveMetadata, LiveMetadataUpdate } from "@streamkit/contracts";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function LiveMetadataEditor({
  metadata,
  busy,
  canEdit,
  onSave,
}: {
  metadata: LiveMetadata;
  busy: boolean;
  canEdit: boolean;
  onSave: (input: LiveMetadataUpdate) => Promise<void>;
}) {
  const [title, setTitle] = useState(metadata.title ?? "");
  const [draft, setDraft] = useState(false);
  useEffect(() => {
    setTitle(metadata.title ?? "");
    setDraft(false);
  }, [metadata.title]);
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Metadados da live</h3>
          <p className="text-xs text-muted-foreground">
            Valores atuais do provider; alterações ficam marcadas como rascunho.
          </p>
        </div>
        {draft && <span className="text-xs text-warning">Alterado localmente</span>}
      </div>
      <label className="grid gap-1 text-xs font-medium">
        Título
        <Input
          value={title}
          maxLength={200}
          disabled={!canEdit}
          onChange={(event) => {
            setTitle(event.target.value);
            setDraft(true);
          }}
        />
      </label>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium">
          Categoria / jogo
          <Input value={metadata.category ?? "Não informado"} disabled aria-readonly="true" />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Idioma
          <Input value={metadata.language ?? "Não informado"} disabled aria-readonly="true" />
        </label>
      </div>
      <label className="mt-3 grid gap-1 text-xs font-medium">
        Descrição
        <Textarea value={metadata.description ?? "Não informado"} disabled aria-readonly="true" />
      </label>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {[
          ["Modo lento", metadata.slowMode],
          ["Somente seguidores", metadata.followersOnly],
          ["Somente inscritos", metadata.subscribersOnly],
        ].map(([label, checked]) => (
          <label
            key={label as string}
            className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
          >
            {label as string}
            <Switch checked={Boolean(checked)} disabled aria-label={label as string} />
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          loading={busy}
          disabled={!canEdit || !draft || !title.trim()}
          onClick={() => void onSave({ title })}
        >
          Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!draft || busy}
          onClick={() => {
            setTitle(metadata.title ?? "");
            setDraft(false);
          }}
        >
          Descartar
        </Button>
      </div>
    </section>
  );
}
