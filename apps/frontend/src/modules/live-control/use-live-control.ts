import type { LiveStream } from "@streamkit/contracts";
import { useCallback, useEffect, useState } from "react";

import { liveControlApi } from "./live-control-api";

export function useLiveControl(active: boolean) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setStreams(await liveControlApi.list());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "NÃ£o foi possÃ­vel carregar o controle da live.",
      );
    }
  }, []);
  useEffect(() => {
    if (!active) return;
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [active, load]);
  return { error, load, selectedId, select: setSelectedId, streams };
}
