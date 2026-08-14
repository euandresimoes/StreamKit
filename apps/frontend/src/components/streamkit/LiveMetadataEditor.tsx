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
  controls = [],
  onSave,
  showHeader = true,
}: {
  metadata: LiveMetadata;
  busy: boolean;
  canEdit: boolean;
  controls?: { editable: boolean; id: string; label: string }[];
  onSave: (input: LiveMetadataUpdate) => Promise<void>;
  showHeader?: boolean;
}) {
  const [title, setTitle] = useState(metadata.title ?? "");
  const [category, setCategory] = useState(metadata.category ?? "");
  const [language, setLanguage] = useState(metadata.language ?? "");
  const [description, setDescription] = useState(metadata.description ?? "");
  const [slowMode, setSlowMode] = useState(Boolean(metadata.slowMode));
  const [draft, setDraft] = useState(false);
  useEffect(() => {
    setTitle(metadata.title ?? "");
    setCategory(metadata.category ?? "");
    setLanguage(metadata.language ?? "");
    setDescription(metadata.description ?? "");
    setSlowMode(Boolean(metadata.slowMode));
    setDraft(false);
  }, [
    metadata.category,
    metadata.description,
    metadata.language,
    metadata.slowMode,
    metadata.title,
  ]);
  return (
    <section className="flex h-full w-full min-h-0 flex-col overflow-y-auto bg-card p-4">
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Metadados da live</h3>
            <p className="text-xs text-muted-foreground">
              {canEdit
                ? "Valores atuais do provider; alterações ficam marcadas como rascunho."
                : "Conecte uma plataforma para habilitar a edição dos metadados."}
            </p>
          </div>
          {draft && <span className="text-xs text-warning">Alterado localmente</span>}
        </div>
      )}
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
          <Input
            value={category}
            placeholder="Não informado"
            disabled={!canEdit}
            onChange={(event) => {
              setCategory(event.target.value);
              setDraft(true);
            }}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Idioma
          <Input
            value={language}
            placeholder="Não informado"
            disabled={!canEdit}
            onChange={(event) => {
              setLanguage(event.target.value);
              setDraft(true);
            }}
          />
        </label>
      </div>
      <label className="mt-3 grid gap-1 text-xs font-medium">
        Descrição
        <Textarea
          value={description}
          placeholder="Não informado"
          disabled={!canEdit}
          onChange={(event) => {
            setDescription(event.target.value);
            setDraft(true);
          }}
        />
      </label>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {controls.map(({ id, label, editable }) => (
          <label
            key={id}
            className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
          >
            {label}
            <Switch
              checked={
                id === "slowMode" ? slowMode : Boolean(metadata[id as keyof typeof metadata])
              }
              disabled={!canEdit || !editable}
              aria-label={label}
              onCheckedChange={(checked) => {
                if (id === "slowMode") setSlowMode(checked);
                setDraft(true);
              }}
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          loading={busy}
          disabled={!canEdit || !draft || !title.trim()}
          onClick={() =>
            void onSave({
              category: category || null,
              description: description || null,
              language: language || null,
              slowMode,
              title,
            })
          }
        >
          Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!draft || busy}
          onClick={() => {
            setTitle(metadata.title ?? "");
            setCategory(metadata.category ?? "");
            setLanguage(metadata.language ?? "");
            setDescription(metadata.description ?? "");
            setSlowMode(Boolean(metadata.slowMode));
            setDraft(false);
          }}
        >
          Descartar
        </Button>
      </div>
    </section>
  );
}
