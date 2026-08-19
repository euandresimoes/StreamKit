import type { TodoBoard, TodoCard, TodoTemplate, Workspace } from "@streamlet/contracts";
import { useCallback, useEffect, useState } from "react";

import { todoApi } from "./todo-api";
import i18n from "@/i18n";

export function useTodoBoard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [board, setBoard] = useState<TodoBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TodoTemplate[]>([]);

  const loadBoard = useCallback(async (id: string | null) => {
    setSelectedId(id);
    setBoard(id ? await todoApi.board(id) : null);
    setTemplates(id ? await todoApi.listTemplates(id) : []);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await todoApi.list();
      setWorkspaces(result.items);
      const id = result.items.some((workspace) => workspace.id === result.selectedId)
        ? result.selectedId
        : (result.items[0]?.id ?? null);
      await loadBoard(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : i18n.t("errors.loadTodo"));
    } finally {
      setLoading(false);
    }
  }, [loadBoard]);

  useEffect(() => void reload(), [reload]);

  const mutate = useCallback(
    async (operation: () => Promise<unknown>, refreshList = false) => {
      setBusy(true);
      setError(null);
      try {
        await operation();
        if (refreshList) await reload();
        else await loadBoard(selectedId);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : i18n.t("errors.genericOperation"));
      } finally {
        setBusy(false);
      }
    },
    [loadBoard, reload, selectedId],
  );

  return {
    board,
    busy,
    error,
    loading,
    workspaces,
    select: async (id: string) => {
      setLoading(true);
      try {
        await todoApi.selectWorkspace(id);
        await loadBoard(id);
      } finally {
        setLoading(false);
      }
    },
    createWorkspace: async (name: string, icon = "📋") => {
      setBusy(true);
      setError(null);
      try {
        const created = await todoApi.createWorkspace(name, icon);
        await todoApi.selectWorkspace(created.id);
        await reload();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : i18n.t("errors.loadWorkspace"));
      } finally {
        setBusy(false);
      }
    },
    deleteWorkspace: async (workspaceId: string) => {
      setBusy(true);
      setError(null);
      const deletingSelected = selectedId === workspaceId;
      if (deletingSelected) {
        setSelectedId(null);
        setBoard(null);
      }
      try {
        await todoApi.deleteWorkspace(workspaceId);
        await reload();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : i18n.t("errors.deleteWorkspace"));
        if (deletingSelected) await reload();
      } finally {
        setBusy(false);
      }
    },
    updateWorkspace: (workspaceId: string, body: Parameters<typeof todoApi.updateWorkspace>[1]) =>
      mutate(() => todoApi.updateWorkspace(workspaceId, body), true),
    createColumn: (name: string) =>
      selectedId ? mutate(() => todoApi.createColumn(selectedId, name)) : Promise.resolve(),
    deleteColumn: (columnId: string) => mutate(() => todoApi.deleteColumn(columnId)),
    updateColumn: (columnId: string, body: Parameters<typeof todoApi.updateColumn>[1]) =>
      mutate(() => todoApi.updateColumn(columnId, body)),
    createCard: (columnId: string, title: string) =>
      mutate(() => todoApi.createCard(columnId, title)),
    deleteCard: (cardId: string) => mutate(() => todoApi.deleteCard(cardId)),
    updateCard: (cardId: string, body: Parameters<typeof todoApi.updateCard>[1]) =>
      mutate(() => todoApi.updateCard(cardId, body)),
    moveCard: (card: TodoCard, columnId: string, position = 0) =>
      mutate(() => todoApi.moveCard(card.id, { columnId, position })),
    templates,
    createTemplate: (name: string) =>
      selectedId
        ? mutate(() => todoApi.createTemplate(selectedId, { name }), true)
        : Promise.resolve(),
    applyTemplate: (templateId: string) =>
      selectedId ? mutate(() => todoApi.applyTemplate(selectedId, templateId)) : Promise.resolve(),
    deleteTemplate: (templateId: string) => mutate(() => todoApi.deleteTemplate(templateId), true),
    reload,
  };
}
