import type { LiveStream } from "@streamkit/contracts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { liveControlApi } from "./live-control-api";

const SELECTED_LIVE_STORAGE_KEY = "streamkit:selected-live-connection";

type LiveSelectionContextValue = {
  error: string | null;
  load: () => Promise<void>;
  selected: LiveStream | null;
  selectedId: string | null;
  select: (id: string) => void;
  streams: LiveStream[];
};

const LiveSelectionContext = createContext<LiveSelectionContextValue | null>(null);

export function LiveSelectionProvider({ children }: { children: React.ReactNode }) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(SELECTED_LIVE_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStreams(await liveControlApi.list());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "NÃ£o foi possÃ­vel carregar as lives conectadas.",
      );
    }
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem(SELECTED_LIVE_STORAGE_KEY, id);
    } catch {
      // The app can continue with an in-memory selection when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!streams.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (selectedId && streams.some((stream) => stream.connectionId === selectedId)) return;
    select(streams[0]!.connectionId);
  }, [select, selectedId, streams]);

  const value = useMemo<LiveSelectionContextValue>(
    () => ({
      error,
      load,
      selected: streams.find((stream) => stream.connectionId === selectedId) ?? null,
      selectedId,
      select,
      streams,
    }),
    [error, load, selectedId, select, streams],
  );

  return <LiveSelectionContext.Provider value={value}>{children}</LiveSelectionContext.Provider>;
}

export function useLiveSelection() {
  const context = useContext(LiveSelectionContext);
  if (!context) throw new Error("useLiveSelection must be used inside LiveSelectionProvider");
  return context;
}
