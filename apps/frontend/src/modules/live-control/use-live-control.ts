import type { LiveMetadataUpdate, LiveStream } from "@streamkit/contracts";
import { useCallback, useEffect, useState } from "react";

import { liveControlApi } from "./live-control-api";

export function useLiveControl(active: boolean) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setStreams(await liveControlApi.list());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível carregar o controle da live.",
      );
    }
  }, []);
  useEffect(() => {
    if (!active) return;
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [active, load]);
  const updateMetadata = async (input: LiveMetadataUpdate) => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const next = await liveControlApi.updateMetadata(selectedId, input);
      setStreams((items) =>
        items.map((item) => (item.connectionId === next.connectionId ? next : item)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar os metadados.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, load, selectedId, select: setSelectedId, streams, updateMetadata };
}
