import type { IntegrationConnection, SaveIntegrationConnectionRequest } from "@streamkit/contracts";
import { useCallback, useEffect, useState } from "react";

import { integrationApi } from "./integration-api";

export function useIntegrations(active: boolean) {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setError(null);
      setConnections(await integrationApi.listConnections());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível carregar as integrações.",
      );
    }
  }, []);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);
  const execute = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await operation();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a integração.");
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    connections,
    error,
    remove: (id: string) => execute(() => integrationApi.deleteConnection(id)),
    save: (input: SaveIntegrationConnectionRequest) =>
      execute(() => integrationApi.saveConnection(input)),
  };
}
