import {
  type MoveCardRequest,
  TodoBoardSchema,
  TodoCardSchema,
  TodoColumnSchema,
  WorkspaceListResponseSchema,
  WorkspaceSchema,
} from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";

export const todoApi = {
  list: () => apiClient.request("/api/v1/todo/workspaces", { schema: WorkspaceListResponseSchema }),
  board: (id: string) =>
    apiClient.request(`/api/v1/todo/workspaces/${id}`, { schema: TodoBoardSchema }),
  createWorkspace: (name: string, icon: string) =>
    apiClient.request("/api/v1/todo/workspaces", {
      method: "POST",
      body: { name, icon },
      schema: WorkspaceSchema,
    }),
  selectWorkspace: (workspaceId: string | null) =>
    apiClient.request("/api/v1/todo/workspaces/select", {
      method: "POST",
      body: { workspaceId },
    }),
  deleteWorkspace: (workspaceId: string) =>
    apiClient.request(`/api/v1/todo/workspaces/${workspaceId}`, { method: "DELETE" }),
  createColumn: (workspaceId: string, name: string) =>
    apiClient.request(`/api/v1/todo/workspaces/${workspaceId}/columns`, {
      method: "POST",
      body: { name },
      schema: TodoColumnSchema,
    }),
  deleteColumn: (columnId: string) =>
    apiClient.request(`/api/v1/todo/columns/${columnId}/delete`, {
      method: "POST",
      body: { strategy: "delete" },
    }),
  createCard: (columnId: string, title: string) =>
    apiClient.request(`/api/v1/todo/columns/${columnId}/cards`, {
      method: "POST",
      body: { title },
      schema: TodoCardSchema,
    }),
  deleteCard: (cardId: string) =>
    apiClient.request(`/api/v1/todo/cards/${cardId}`, { method: "DELETE" }),
  moveCard: (cardId: string, input: MoveCardRequest) =>
    apiClient.request(`/api/v1/todo/cards/${cardId}/move`, {
      method: "POST",
      body: input,
      schema: TodoCardSchema,
    }),
};
