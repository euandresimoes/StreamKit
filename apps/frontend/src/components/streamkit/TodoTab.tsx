import type { TodoCard } from "@streamkit/contracts";
import { useState } from "react";
import { Folder, GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTodoBoard } from "@/modules/todo/use-todo-board";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateItemDialog } from "./CreateItemDialog";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { BaseConfirmDialog } from "@/components/base/BaseConfirmDialog";

export function TodoTab() {
  const todo = useTodoBoard();
  const [dragging, setDragging] = useState<TodoCard | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [composing, setComposing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    kind: "workspace" | "column" | "card";
    name: string;
  } | null>(null);

  const submitCard = async (columnId: string) => {
    const title = draft.trim();
    if (!title) return;
    await todo.createCard(columnId, title);
    setDraft("");
    setComposing(null);
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border px-3 py-5 md:flex">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Workspaces
        </p>
        {todo.workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className={cn(
              "group flex items-center rounded-xl transition-colors",
              workspace.id === todo.board?.workspace.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <button
              onClick={() => void todo.select(workspace.id)}
              className="press flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-[13px]"
            >
              <span className="flex size-4 shrink-0 items-center justify-center text-sm">
                {workspace.icon}
              </span>
              <span className="flex-1 truncate font-medium">{workspace.name}</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="mr-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                  aria-label={`Opções de ${workspace.name}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => {
                    setPendingDelete({ id: workspace.id, kind: "workspace", name: workspace.name });
                  }}
                >
                  <Trash2 /> Excluir workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 justify-start"
          disabled={todo.busy}
          onClick={() => setCreatingWorkspace(true)}
        >
          <Plus /> Novo workspace
        </Button>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-6 py-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {todo.board && <span aria-hidden="true">{todo.board.workspace.icon}</span>}
              {todo.board?.workspace.name ?? "TODO"}
            </h2>
            <p className="text-xs text-muted-foreground">Kanban local e persistente</p>
          </div>
          <Button
            className="ml-auto"
            size="sm"
            disabled={!todo.board || todo.busy}
            onClick={() => setCreatingColumn(true)}
          >
            <Plus /> Coluna
          </Button>
        </header>

        {todo.error && (
          <div className="mx-6 mb-3 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            <span className="flex-1">{todo.error}</span>
            <Button variant="ghost" size="sm" onClick={() => void todo.reload()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {todo.loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Carregando workspaces…
          </div>
        ) : !todo.board ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Folder className="size-8" />
            <p className="text-sm">Crie seu primeiro workspace para começar.</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-6 pb-6">
            {todo.board.columns.map((column) => {
              const cards = todo.board!.cards.filter((card) => card.columnId === column.id);
              return (
                <div
                  key={column.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOver(column.id);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={() => {
                    if (dragging && dragging.columnId !== column.id)
                      void todo.moveCard(dragging, column.id);
                    setDragging(null);
                    setOver(null);
                  }}
                  className={cn(
                    "flex w-[290px] shrink-0 flex-col rounded-3xl border bg-surface/50 p-3 transition-colors",
                    over === column.id ? "border-primary/60" : "border-border",
                  )}
                >
                  <div className="flex items-center gap-2 px-1 pb-3">
                    <span className="size-2 rounded-full bg-primary" />
                    <h3 className="flex-1 truncate text-[13px] font-semibold">{column.name}</h3>
                    <span className="text-[11px] text-muted-foreground">{cards.length}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Opções de ${column.name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => {
                            setPendingDelete({ id: column.id, kind: "column", name: column.name });
                          }}
                        >
                          <Trash2 /> Excluir coluna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                    {cards.map((card) => (
                      <article
                        key={card.id}
                        draggable={!todo.busy}
                        onDragStart={() => setDragging(card)}
                        className="raise group rounded-2xl border border-border bg-card p-3"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 size-3.5 cursor-grab text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium leading-snug">{card.title}</p>
                            {card.description && (
                              <p className="mt-1 text-[11.5px] text-muted-foreground">
                                {card.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Excluir ${card.title}`}
                            onClick={() =>
                              setPendingDelete({ id: card.id, kind: "card", name: card.title })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {composing === column.id ? (
                    <div className="mt-2 flex gap-1.5">
                      <Input
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void submitCard(column.id);
                          if (event.key === "Escape") setComposing(null);
                        }}
                        placeholder="Título do card"
                        className="h-8 text-[13px]"
                      />
                      <Button size="icon-sm" onClick={() => void submitCard(column.id)}>
                        <Plus />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 justify-start"
                      onClick={() => setComposing(column.id)}
                    >
                      <Plus /> Adicionar card
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <CreateWorkspaceDialog
        open={creatingWorkspace}
        onOpenChange={setCreatingWorkspace}
        busy={todo.busy}
        onSubmit={todo.createWorkspace}
      />
      <BaseConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        busy={todo.busy}
        title={`Excluir ${pendingDelete?.kind === "workspace" ? "workspace" : pendingDelete?.kind === "column" ? "coluna" : "card"}?`}
        description={`“${pendingDelete?.name ?? ""}” e todo o conteúdo relacionado serão excluídos permanentemente.`}
        onConfirm={async () => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === "workspace") await todo.deleteWorkspace(pendingDelete.id);
          else if (pendingDelete.kind === "column") await todo.deleteColumn(pendingDelete.id);
          else await todo.deleteCard(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
      <CreateItemDialog
        open={creatingColumn}
        onOpenChange={setCreatingColumn}
        title="Nova coluna"
        description="Adicione uma etapa ao workspace atual."
        placeholder="Ex.: Em andamento"
        label="Criar coluna"
        busy={todo.busy}
        onSubmit={todo.createColumn}
      />
    </div>
  );
}
