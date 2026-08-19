import {
  type MoveCardRequest,
  TodoBoardSchema,
  TodoCardSchema,
  TodoColumnSchema,
  TodoTemplateSchema,
  type UpdateCardRequest,
  type UpdateColumnRequest,
  type UpdateWorkspaceRequest,
  WorkspaceListResponseSchema,
  WorkspaceSchema,
} from "@streamlet/contracts";

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
  updateWorkspace: (id: string, body: UpdateWorkspaceRequest) =>
    apiClient.request(`/api/v1/todo/workspaces/${id}`, {
      method: "PATCH",
      body,
      schema: WorkspaceSchema,
    }),
  updateColumn: (id: string, body: UpdateColumnRequest) =>
    apiClient.request(`/api/v1/todo/columns/${id}`, {
      method: "PATCH",
      body,
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
  updateCard: (id: string, body: UpdateCardRequest) =>
    apiClient.request(`/api/v1/todo/cards/${id}`, {
      method: "PATCH",
      body,
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
  listTemplates: (workspaceId: string) =>
    apiClient.request(`/api/v1/todo/workspaces/${workspaceId}/templates`, {
      schema: TodoTemplateSchema.array(),
    }),
  createTemplate: (workspaceId: string, body: { name: string; description?: string }) =>
    apiClient.request(`/api/v1/todo/workspaces/${workspaceId}/templates`, {
      method: "POST",
      body,
      schema: TodoTemplateSchema,
    }),
  applyTemplate: (workspaceId: string, templateId: string) =>
    apiClient.request(`/api/v1/todo/workspaces/${workspaceId}/templates/${templateId}/apply`, {
      method: "POST",
      schema: TodoBoardSchema,
    }),
  deleteTemplate: (id: string) =>
    apiClient.request(`/api/v1/todo/templates/${id}`, { method: "DELETE" }),
};
