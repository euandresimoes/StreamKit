import { useSyncExternalStore } from "react";

let guideOpen = false;
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
