import { useSyncExternalStore } from "react";

let guideOpen = false;
export const GUIDE_COMPLETED_STORAGE_KEY = "streamlet:initial-guide-completed";
const listeners = new Set<() => void>();
export const GUIDE_CLOSE_MODALS_EVENT = "streamlet:guide-close-modals";

export function setGuideOpen(nextOpen: boolean) {
  if (guideOpen === nextOpen) return;
  guideOpen = nextOpen;
  listeners.forEach((listener) => listener());
}

export function useGuideOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => guideOpen,
    () => false,
  );
}
