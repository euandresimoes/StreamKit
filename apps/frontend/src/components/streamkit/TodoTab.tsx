import type { TodoCard, TodoColumn, TodoPriority, UpdateCardRequest } from "@streamkit/contracts";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Check,
  Folder,
  GripVertical,
  LayoutTemplate,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { BaseColorPicker } from "@/components/base/BaseColorPicker";
import { BaseConfirmDialog } from "@/components/base/BaseConfirmDialog";
import { BaseModal } from "@/components/base/BaseModal";
import { BasePriorityBadge } from "@/components/base/BasePriorityBadge";
import { BaseTag } from "@/components/base/BaseTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTodoBoard } from "@/modules/todo/use-todo-board";
import { cn } from "@/lib/utils";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";

const PRIORITIES: TodoPriority[] = ["low", "normal", "high", "urgent"];
const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};
const TODO_TEXT = {
  addCard: "Adicionar card",
  addColumn: "Nova coluna",
  boardHint: "Planeje, priorize e acompanhe o trabalho",
  cardDetails: "Detalhes do card",
  cardTitle: "Titulo do card",
  columnTitle: "Titulo da coluna",
  description: "Descricao",
  notes: "Notas",
  priority: "Prioridade",
  searchWorkspace: "Buscar workspace",
  templates: "Templates",
  workspaces: "Workspaces",
};
const EMOJIS = ["📋", "🎯", "🎮", "🎬", "💡", "🚀", "⭐", "🧰", "🗂️", "📝"];

type PendingDelete = { id: string; kind: "workspace" | "column" | "card"; name: string };
type DragGeometry = {
  currentX: number;
  currentY: number;
  grabX: number;
  grabY: number;
  height: number;
  startX: number;
  startY: number;
  tilt: number;
  width: number;
};
type DragItem =
  | ({ kind: "column"; item: TodoColumn } & DragGeometry)
  | ({ kind: "card"; item: TodoCard } & DragGeometry);
type DragTarget =
  { kind: "column"; columnId: string } | { kind: "card"; columnId: string; cardId: string | null };
type DragRect = { id: string; columnId?: string | undefined; rect: DOMRect };

export function TodoTab() {
  const todo = useTodoBoard();
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newColumn, setNewColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newCardColumn, setNewCardColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [columnDraft, setColumnDraft] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const dragClickBlocked = useRef(false);
  const dragRects = useRef<{ columns: DragRect[]; cards: DragRect[] }>({ columns: [], cards: [] });

  const cardsByColumn = useMemo(
    () =>
      new Map(
        (todo.board?.columns ?? []).map((column) => [
          column.id,
          todo.board?.cards.filter((card) => card.columnId === column.id) ?? [],
        ]),
      ),
    [todo.board],
  );
  const selectedCard = todo.board?.cards.find((card) => card.id === selectedCardId) ?? null;
  const orderedColumns = useMemo(() => {
    const columns = [...(todo.board?.columns ?? [])];
    if (dragItem?.kind !== "column" || dragTarget?.kind !== "column") return columns;
    const movingIndex = columns.findIndex((column) => column.id === dragItem.item.id);
    const targetIndex = columns.findIndex((column) => column.id === dragTarget.columnId);
    if (movingIndex < 0 || targetIndex < 0 || movingIndex === targetIndex) return columns;
    const moving = columns.splice(movingIndex, 1)[0];
    if (!moving) return columns;
    columns.splice(targetIndex, 0, moving);
    return columns;
  }, [dragItem, dragTarget, todo.board?.columns]);
  const workspaces = [...todo.workspaces]
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || a.position - b.position)
    .filter((workspace) => workspace.name.toLowerCase().includes(workspaceQuery.toLowerCase()));

  const createColumn = async () => {
    if (!newColumnTitle.trim()) return;
    await todo.createColumn(newColumnTitle.trim());
    setNewColumnTitle("");
    setNewColumn(false);
  };
  const createCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    await todo.createCard(columnId, newCardTitle.trim());
    setNewCardTitle("");
    setNewCardColumn(null);
  };
  const updateCard = async (card: TodoCard, body: UpdateCardRequest) => {
    await todo.updateCard(card.id, body);
  };
  const updateDragPosition = (clientX: number, clientY: number) => {
    setDragItem((current) => {
      if (!current) return current;
      const velocity = clientX - current.currentX;
      const force = Math.max(-2.5, Math.min(2.5, velocity * 0.16));
      return { ...current, currentX: clientX, currentY: clientY, tilt: force };
    });
    setDragTarget((current) => {
      const next = resolveDragTarget(clientX, clientY);
      if (dragTargetsEqual(current, next)) return current;
      return next;
    });
  };
  const finishDrag = (clientX: number, clientY: number) => {
    const current = dragItem;
    if (!current) return;
    const distance = Math.hypot(clientX - current.startX, clientY - current.startY);
    const target = resolveDragTarget(clientX, clientY) ?? dragTarget;

    if (distance > 6 && current.kind === "column" && target?.kind === "column") {
      const targetColumn = todo.board?.columns.find((column) => column.id === target.columnId);
      if (targetColumn && targetColumn.id !== current.item.id)
        void todo.updateColumn(current.item.id, { position: targetColumn.position });
    }
    if (distance > 6 && current.kind === "card" && target?.kind === "card") {
      const targetColumn = todo.board?.columns.find((column) => column.id === target.columnId);
      if (targetColumn) {
        const targetCards = (cardsByColumn.get(targetColumn.id) ?? []).filter(
          (card) => card.id !== current.item.id,
        );
        const targetIndex = target.cardId
          ? Math.max(
              0,
              targetCards.findIndex((card) => card.id === target.cardId),
            )
          : targetCards.length;
        void todo.moveCard(
          current.item,
          targetColumn.id,
          targetIndex < 0 ? targetCards.length : targetIndex,
        );
      }
    }
    if (distance <= 6 || !target) {
      setDragItem(null);
      setDragTarget(null);
      dragRects.current = { columns: [], cards: [] };
      return;
    }
    dragClickBlocked.current = true;
    setDragItem(null);
    setDragTarget(null);
    dragRects.current = { columns: [], cards: [] };
  };
  const resolveDragTarget = (clientX: number, clientY: number): DragTarget | null => {
    if (dragItem?.kind === "column") {
      if (dragTarget?.kind === "column") {
        const current = dragRects.current.columns.find(
          (candidate) => candidate.id === dragTarget.columnId,
        );
        if (
          current &&
          clientX >= current.rect.left - 24 &&
          clientX <= current.rect.right + 24 &&
          clientY >= current.rect.top &&
          clientY <= current.rect.bottom
        ) {
          return dragTarget;
        }
      }
      const nearest = dragRects.current.columns
        .filter((candidate) => candidate.id !== dragItem.item.id)
        .sort(
          (a, b) =>
            Math.abs(clientX - (a.rect.left + a.rect.width / 2)) -
            Math.abs(clientX - (b.rect.left + b.rect.width / 2)),
        )[0];
      return nearest ? { kind: "column", columnId: nearest.id } : null;
    }
    const card = dragRects.current.cards
      .filter((candidate) => candidate.id !== dragItem?.item.id)
      .find(
        (candidate) =>
          clientX >= candidate.rect.left &&
          clientX <= candidate.rect.right &&
          clientY >= candidate.rect.top &&
          clientY <= candidate.rect.bottom,
      );
    if (card?.columnId) return { kind: "card", columnId: card.columnId, cardId: card.id };
    const column = dragRects.current.columns.find(
      (candidate) =>
        clientX >= candidate.rect.left &&
        clientX <= candidate.rect.right &&
        clientY >= candidate.rect.top &&
        clientY <= candidate.rect.bottom,
    );
    return column ? { kind: "card", columnId: column.id, cardId: null } : null;
  };
  const previewCardsForColumn = (columnId: string) => {
    const cards = (cardsByColumn.get(columnId) ?? []).filter(
      (card) => !(dragItem?.kind === "card" && card.id === dragItem.item.id),
    );
    if (
      dragItem?.kind !== "card" ||
      dragTarget?.kind !== "card" ||
      dragTarget.columnId !== columnId
    )
      return cards;
    const insertIndex = dragTarget.cardId
      ? Math.max(
          0,
          cards.findIndex((card) => card.id === dragTarget.cardId),
        )
      : cards.length;
    cards.splice(insertIndex < 0 ? cards.length : insertIndex, 0, dragItem.item);
    return cards;
  };
  const beginColumnDrag = (event: ReactPointerEvent<HTMLElement>, column: TodoColumn) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.closest("section")?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    dragRects.current = {
      columns: [...document.querySelectorAll<HTMLElement>("[data-todo-column-id]")]
        .map((element) => ({
          id: element.dataset["todoColumnId"] ?? "",
          rect: element.getBoundingClientRect(),
        }))
        .filter((item) => item.id),
      cards: [...document.querySelectorAll<HTMLElement>("[data-todo-card-id]")]
        .map((element) => ({
          id: element.dataset["todoCardId"] ?? "",
          columnId: element.closest<HTMLElement>("[data-todo-column-id]")?.dataset["todoColumnId"],
          rect: element.getBoundingClientRect(),
        }))
        .filter((item) => item.id),
    };
    setDragItem({
      kind: "column",
      item: column,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      tilt: 0,
    });
    setDragTarget({ kind: "column", columnId: column.id });
  };
  const beginCardDrag = (event: ReactPointerEvent<HTMLElement>, card: TodoCard) => {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button,input,textarea,[role='button']")
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    dragRects.current = {
      columns: [...document.querySelectorAll<HTMLElement>("[data-todo-column-id]")]
        .map((element) => ({
          id: element.dataset["todoColumnId"] ?? "",
          rect: element.getBoundingClientRect(),
        }))
        .filter((item) => item.id),
      cards: [...document.querySelectorAll<HTMLElement>("[data-todo-card-id]")]
        .map((element) => ({
          id: element.dataset["todoCardId"] ?? "",
          columnId: element.closest<HTMLElement>("[data-todo-column-id]")?.dataset["todoColumnId"],
          rect: element.getBoundingClientRect(),
        }))
        .filter((item) => item.id),
    };
    setDragItem({
      kind: "card",
      item: card,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      tilt: 0,
    });
    setDragTarget({ kind: "card", columnId: card.columnId, cardId: card.id });
  };

  useEffect(() => {
    if (!dragItem) return;
    const handleMove = (event: PointerEvent) => updateDragPosition(event.clientX, event.clientY);
    const handleUp = (event: PointerEvent) => finishDrag(event.clientX, event.clientY);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [cardsByColumn, dragItem, todo]);

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 md:p-5">
      <aside className="glass-panel flex w-[248px] shrink-0 flex-col rounded-2xl p-3">
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
            {TODO_TEXT.workspaces}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setCreatingWorkspace(true)}>
            <Plus />
          </Button>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background/30 px-2">
          <Search className="size-3.5 text-muted-foreground" />
          <Input
            value={workspaceQuery}
            onChange={(event) => setWorkspaceQuery(event.target.value)}
            placeholder={TODO_TEXT.searchWorkspace}
            className="h-8 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              style={{
                backgroundColor: workspace.accentColor ? `${workspace.accentColor}22` : undefined,
              }}
              className={cn(
                "group flex items-center rounded-xl border border-transparent",
                workspace.id === todo.board?.workspace.id && "border-border-strong",
              )}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                onClick={() => void todo.select(workspace.id)}
              >
                <span>{workspace.icon}</span>
                <span className="truncate">{workspace.name}</span>
                {workspace.isPinned && (
                  <Pin className="size-3 shrink-0 fill-current text-primary" />
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onSelect={() =>
                      void todo.updateWorkspace(workspace.id, { isPinned: !workspace.isPinned })
                    }
                  >
                    <Pin /> {workspace.isPinned ? "Desfixar" : "Fixar"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() =>
                      setPendingDelete({
                        id: workspace.id,
                        kind: "workspace",
                        name: workspace.name,
                      })
                    }
                  >
                    <Trash2 /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setCreatingWorkspace(true)}
        >
          <Plus /> Novo workspace
        </Button>
      </aside>

      <main className="glass-panel flex min-w-0 flex-1 flex-col rounded-2xl">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="grid size-10 place-items-center rounded-xl border border-border bg-background/40 text-xl">
                {todo.board?.workspace.icon ?? "📋"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="grid size-8 place-items-center rounded-lg hover:bg-accent"
                    onClick={() =>
                      todo.board &&
                      void todo.updateWorkspace(todo.board.workspace.id, { icon: emoji })
                    }
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="min-w-0 flex-1">
            {todo.board && (
              <InlineWorkspaceTitle
                value={todo.board.workspace.name}
                onSave={(name) => void todo.updateWorkspace(todo.board!.workspace.id, { name })}
              />
            )}
            <p className="text-[11px] text-muted-foreground">{TODO_TEXT.boardHint}</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                aria-label="Cor do workspace"
                className="size-5 rounded-full border border-border"
                style={{ backgroundColor: todo.board?.workspace.accentColor ?? "var(--muted)" }}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <BaseColorPicker
                value={todo.board?.workspace.accentColor ?? null}
                onChange={(accentColor) =>
                  todo.board && void todo.updateWorkspace(todo.board.workspace.id, { accentColor })
                }
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate /> {TODO_TEXT.templates}
          </Button>
        </header>

        {todo.error && (
          <div className="mx-5 mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {todo.error}
          </div>
        )}
        {!todo.board ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Folder className="size-10" />
            Crie um workspace para comecar.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-5">
            {orderedColumns.map((column) => {
              const cards = previewCardsForColumn(column.id);
              const originalColumnIndex = (todo.board?.columns ?? []).findIndex(
                (item) => item.id === column.id,
              );
              const previewColumnIndex = orderedColumns.findIndex((item) => item.id === column.id);
              const isDraggingColumn =
                dragItem?.kind === "column" && dragItem.item.id === column.id;
              return (
                <section
                  key={column.id}
                  data-todo-column-id={column.id}
                  className={cn(
                    "flex w-[300px] shrink-0 flex-col rounded-2xl border bg-background/20 p-3 transition-[transform,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
                    isDraggingColumn && "opacity-20",
                  )}
                  style={{
                    backgroundColor: column.color ? `${column.color}18` : undefined,
                    borderTopColor: column.color ?? undefined,
                    pointerEvents: isDraggingColumn ? "none" : undefined,
                    transform:
                      dragItem?.kind === "column" && originalColumnIndex !== previewColumnIndex
                        ? `translateX(${(originalColumnIndex - previewColumnIndex) * 18}px)`
                        : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      className="cursor-grab rounded-md p-1 text-muted-foreground transition active:cursor-grabbing active:scale-95"
                      onPointerDown={(event) => beginColumnDrag(event, column)}
                      aria-label="Arrastar coluna"
                    >
                      <GripVertical className="size-3.5" />
                    </button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="size-3 rounded-full border border-border"
                          style={{ backgroundColor: column.color ?? "var(--muted)" }}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <BaseColorPicker
                          value={column.color}
                          onChange={(color) => void todo.updateColumn(column.id, { color })}
                        />
                      </PopoverContent>
                    </Popover>
                    {columnDraft === column.id ? (
                      <Input
                        autoFocus
                        defaultValue={column.name}
                        className="h-7 flex-1 text-sm"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void todo.updateColumn(column.id, { name: event.currentTarget.value });
                            setColumnDraft(null);
                          }
                          if (event.key === "Escape") setColumnDraft(null);
                        }}
                      />
                    ) : (
                      <button
                        className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
                        onClick={() => setColumnDraft(column.id)}
                      >
                        {column.name}
                      </button>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {cards.length}
                      {column.wipLimit ? `/${column.wipLimit}` : ""}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onSelect={() =>
                            void todo.updateColumn(column.id, { isPinned: !column.isPinned })
                          }
                        >
                          <Star /> {column.isPinned ? "Desfixar" : "Fixar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() =>
                            setPendingDelete({ id: column.id, kind: "column", name: column.name })
                          }
                        >
                          <Trash2 /> Excluir coluna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="my-3 h-px bg-border" />
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {cards.map((card, cardIndex) => (
                      <TodoCardTile
                        key={card.id}
                        card={card}
                        index={cardIndex}
                        isDragging={dragItem?.kind === "card" && dragItem.item.id === card.id}
                        shift={
                          dragItem?.kind === "card"
                            ? ((cardsByColumn.get(column.id) ?? []).findIndex(
                                (item) => item.id === card.id,
                              ) -
                                cards.findIndex((item) => item.id === card.id)) *
                              10
                            : 0
                        }
                        onPick={(event) => beginCardDrag(event, card)}
                        onColorChange={(accentColor) =>
                          void todo.updateCard(card.id, { accentColor })
                        }
                        onOpen={() => {
                          if (dragClickBlocked.current) {
                            window.setTimeout(() => {
                              dragClickBlocked.current = false;
                            }, 0);
                            return;
                          }
                          setSelectedCardId(card.id);
                        }}
                      />
                    ))}
                  </div>
                  {newCardColumn === column.id ? (
                    <Input
                      autoFocus
                      value={newCardTitle}
                      onChange={(event) => setNewCardTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void createCard(column.id);
                        if (event.key === "Escape") setNewCardColumn(null);
                      }}
                      placeholder={TODO_TEXT.cardTitle}
                      className="mt-2 h-8 text-xs"
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 justify-start"
                      onClick={() => setNewCardColumn(column.id)}
                    >
                      <Plus /> {TODO_TEXT.addCard}
                    </Button>
                  )}
                </section>
              );
            })}
            <section className="w-[300px] shrink-0">
              {newColumn ? (
                <Input
                  autoFocus
                  value={newColumnTitle}
                  onChange={(event) => setNewColumnTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void createColumn();
                    if (event.key === "Escape") setNewColumn(false);
                  }}
                  placeholder={TODO_TEXT.columnTitle}
                  className="h-10"
                />
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setNewColumn(true)}>
                  <Plus /> {TODO_TEXT.addColumn}
                </Button>
              )}
            </section>
          </div>
        )}
      </main>

      {selectedCard && (
        <CardInspector
          card={selectedCard}
          onClose={() => setSelectedCardId(null)}
          onSave={updateCard}
          onDelete={() =>
            setPendingDelete({ id: selectedCard.id, kind: "card", name: selectedCard.title })
          }
        />
      )}
      <CreateWorkspaceDialog
        open={creatingWorkspace}
        onOpenChange={setCreatingWorkspace}
        busy={todo.busy}
        onSubmit={todo.createWorkspace}
      />
      <BaseConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        busy={todo.busy}
        title={`Excluir ${pendingDelete?.kind ?? "item"}?`}
        description={`"${pendingDelete?.name ?? ""}" sera removido permanentemente.`}
        onConfirm={async () => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === "workspace") await todo.deleteWorkspace(pendingDelete.id);
          else if (pendingDelete.kind === "column") await todo.deleteColumn(pendingDelete.id);
          else await todo.deleteCard(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
      <BaseModal
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        title="Templates globais"
        description="Salve e reutilize estruturas em qualquer workspace."
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Nome do template"
            />
            <Button
              disabled={!templateName.trim()}
              onClick={() => {
                void todo.createTemplate(templateName.trim());
                setTemplateName("");
              }}
            >
              Salvar board
            </Button>
          </div>
          {todo.templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-2 rounded-xl border border-border p-3"
            >
              <LayoutTemplate className="size-4 text-primary" />
              <span className="flex-1 text-sm">{template.name}</span>
              <Button size="sm" onClick={() => void todo.applyTemplate(template.id)}>
                Aplicar
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void todo.deleteTemplate(template.id)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </BaseModal>
      {dragItem && <TodoDragOverlay dragItem={dragItem} cardsByColumn={cardsByColumn} />}
    </div>
  );
}

function TodoCardTile({
  card,
  index,
  isDragging,
  shift,
  onPick,
  onColorChange,
  onOpen,
}: {
  card: TodoCard;
  index: number;
  isDragging: boolean;
  shift: number;
  onPick: (event: ReactPointerEvent<HTMLElement>) => void;
  onColorChange: (color: string | null) => void;
  onOpen: () => void;
}) {
  return (
    <article
      data-todo-card-id={card.id}
      onPointerDown={onPick}
      onClick={onOpen}
      className={cn(
        "raise cursor-pointer rounded-xl border border-border bg-card/80 p-3 transition-all duration-300 ease-out hover:border-border-strong",
        isDragging && "opacity-30",
      )}
      style={{
        borderLeftColor: card.accentColor ?? undefined,
        pointerEvents: isDragging ? "none" : undefined,
        transform: shift ? `translateY(${shift}px)` : undefined,
        transitionProperty: "transform, opacity, border-color, box-shadow",
        transitionDelay: isDragging ? "0ms" : `${Math.min(index, 8) * 18}ms`,
      }}
    >
      <TodoCardContent card={card} onColorChange={onColorChange} />
    </article>
  );
}

function dragTargetsEqual(left: DragTarget | null, right: DragTarget | null) {
  if (left === right) return true;
  if (!left || !right || left.kind !== right.kind) return false;
  if (left.kind === "column" && right.kind === "column") return left.columnId === right.columnId;
  if (left.kind === "card" && right.kind === "card")
    return left.columnId === right.columnId && left.cardId === right.cardId;
  return false;
}

function TodoCardContent({
  card,
  onColorChange,
}: {
  card: TodoCard;
  onColorChange?: (color: string | null) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <GripVertical className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{card.title}</p>
          {card.isPinned && <Pin className="size-3 shrink-0 fill-current text-primary" />}
          {onColorChange && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label="Cor do card"
                  className="mt-0.5 size-3.5 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: card.accentColor ?? "var(--muted)" }}
                  onClick={(event) => event.stopPropagation()}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" onClick={(event) => event.stopPropagation()}>
                <BaseColorPicker value={card.accentColor} onChange={onColorChange} />
              </PopoverContent>
            </Popover>
          )}
        </div>
        {card.description && (
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{card.description}</p>
        )}
        {card.notes && (
          <p className="mt-1 line-clamp-2 rounded-lg bg-background/40 px-2 py-1 text-[11px] text-muted-foreground">
            {card.notes}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <BasePriorityBadge priority={card.priority} />
          {card.labels.slice(0, 3).map((label) => (
            <BaseTag key={label}>{label}</BaseTag>
          ))}
          {card.checklist.length > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              <Check className="mr-1 inline size-3" />
              {card.checklist.filter((item) => item.done).length}/{card.checklist.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TodoDragOverlay({
  dragItem,
  cardsByColumn,
}: {
  dragItem: DragItem;
  cardsByColumn: Map<string, TodoCard[]>;
}) {
  const overlayStyle = {
    height: dragItem.height,
    left: dragItem.currentX - dragItem.grabX,
    top: dragItem.currentY - dragItem.grabY,
    transform: `rotate(${dragItem.tilt}deg) scale(1.015)`,
    width: dragItem.width,
  };

  if (dragItem.kind === "card") {
    return (
      <div
        className="pointer-events-none fixed z-[9999] rounded-xl border border-border-strong bg-card p-3 shadow-[var(--shadow-float)] transition-none"
        style={overlayStyle}
      >
        <TodoCardContent card={dragItem.item} />
      </div>
    );
  }

  const cards = cardsByColumn.get(dragItem.item.id) ?? [];
  return (
    <section
      className="pointer-events-none fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-border-strong bg-background/95 p-3 shadow-[var(--shadow-float)] backdrop-blur-xl transition-none"
      style={overlayStyle}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="size-3.5 text-muted-foreground" />
        <span
          className="size-3 rounded-full border border-border"
          style={{ backgroundColor: dragItem.item.color ?? "var(--muted)" }}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{dragItem.item.name}</span>
        <span className="text-[10px] text-muted-foreground">{cards.length}</span>
      </div>
      <div className="my-3 h-px bg-border" />
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
        {cards.slice(0, 6).map((card) => (
          <div
            key={card.id}
            className="rounded-xl border border-border bg-card/80 p-3"
            style={{ borderLeftColor: card.accentColor ?? undefined }}
          >
            <TodoCardContent card={card} />
          </div>
        ))}
      </div>
    </section>
  );
}

function InlineWorkspaceTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && draft.trim()) {
            onSave(draft.trim());
            setEditing(false);
          }
          if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-8 max-w-sm text-base font-semibold"
      />
    );
  }
  return (
    <button
      className="max-w-full truncate text-left text-base font-semibold"
      onClick={() => setEditing(true)}
    >
      {value}
    </button>
  );
}

function CardInspector({
  card,
  onClose,
  onSave,
  onDelete,
}: {
  card: TodoCard;
  onClose: () => void;
  onSave: (card: TodoCard, body: UpdateCardRequest) => Promise<void>;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [priority, setPriority] = useState(card.priority);
  const [color, setColor] = useState(card.accentColor);

  return (
    <aside className="glass-panel flex w-[320px] shrink-0 flex-col rounded-2xl border-l border-border p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {TODO_TEXT.cardDetails}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar detalhes">
          <X />
        </Button>
      </div>
      <div className="space-y-3">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={TODO_TEXT.description}
        />
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={TODO_TEXT.notes}
        />
        <Select value={priority} onValueChange={(value) => setPriority(value as TodoPriority)}>
          <SelectTrigger aria-label={TODO_TEXT.priority}>
            <SelectValue placeholder={TODO_TEXT.priority} />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((item) => (
              <SelectItem key={item} value={item}>
                {PRIORITY_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="size-5 rounded-full border border-border"
                style={{ backgroundColor: color ?? "var(--muted)" }}
              />{" "}
              Cor do card
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <BaseColorPicker value={color} onChange={setColor} />
          </PopoverContent>
        </Popover>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() =>
              void onSave(card, {
                title,
                description: description || null,
                notes: notes || null,
                priority,
                accentColor: color,
              })
            }
          >
            Salvar
          </Button>
          <Button variant="destructive" size="icon" onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
      </div>
    </aside>
  );
}
