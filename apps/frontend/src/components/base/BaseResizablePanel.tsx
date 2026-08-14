import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type PanelMode = "vertical" | "horizontal";
type ResizeEdge = "top" | "left" | "bottom" | "right";

const STORAGE_PREFIX = "streamkit.panel-size.";
const SNAP_STEP = 8;
const SNAP_THRESHOLD = 12;

function clampSize(value: number, minSize: number, maxSize: number) {
  return Math.min(maxSize, Math.max(minSize, value));
}

function readSize(panelId: string, fallback: number, minSize: number, maxSize: number) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = Number(window.localStorage.getItem(`${STORAGE_PREFIX}${panelId}`));
    return Number.isFinite(value) && value > 0
      ? clampSize(value, minSize, maxSize)
      : clampSize(fallback, minSize, maxSize);
  } catch {
    return clampSize(fallback, minSize, maxSize);
  }
}

export function BaseResizablePanel({
  children,
  className = "",
  defaultSize,
  maxSize = 900,
  minSize = 160,
  mode,
  onSizeChange,
  panelId,
  resize,
}: {
  children: ReactNode;
  className?: string;
  defaultSize: number;
  maxSize?: number;
  minSize?: number;
  mode: PanelMode;
  onSizeChange?: (size: number) => void;
  panelId: string;
  resize: ResizeEdge;
}) {
  const [size, setSize] = useState(() => readSize(panelId, defaultSize, minSize, maxSize));
  const startRef = useRef<{ coordinate: number; size: number } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${panelId}`, String(size));
    } catch {
      // A restricted storage environment should not break panel resizing.
    }
    onSizeChange?.(size);
  }, [onSizeChange, panelId, size]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const coordinate = resize === "left" || resize === "right" ? event.clientX : event.clientY;
      const direction = resize === "left" || resize === "top" ? -1 : 1;
      const raw = start.size + (coordinate - start.coordinate) * direction;
      const snappedToEdge =
        Math.abs(raw - minSize) <= SNAP_THRESHOLD
          ? minSize
          : Math.abs(raw - maxSize) <= SNAP_THRESHOLD
            ? maxSize
            : Math.round(raw / SNAP_STEP) * SNAP_STEP;
      const next = clampSize(snappedToEdge, minSize, maxSize);
      setSize(next);
    };
    const stop = () => {
      startRef.current = null;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, [maxSize, minSize, resize]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const coordinate = resize === "left" || resize === "right" ? event.clientX : event.clientY;
    startRef.current = { coordinate, size };
    document.body.style.cursor =
      resize === "left" || resize === "right" ? "ew-resize" : "ns-resize";
    document.body.style.userSelect = "none";
  };

  const sizeStyle = resize === "left" || resize === "right" ? { width: size } : { height: size };
  const edgeClass = {
    top: "top-0 left-0 right-0 h-2 cursor-ns-resize",
    left: "left-0 top-0 bottom-0 w-2 cursor-ew-resize",
    bottom: "bottom-0 left-0 right-0 h-2 cursor-ns-resize",
    right: "right-0 top-0 bottom-0 w-2 cursor-ew-resize",
  }[resize];

  return (
    <section
      className={`relative flex min-h-0 min-w-0 overflow-hidden ${mode === "vertical" ? "flex-col" : "flex-row"} ${className}`}
      style={sizeStyle}
      data-panel-id={panelId}
    >
      <div
        aria-label={`Redimensionar painel ${panelId}`}
        className={`absolute z-20 touch-none rounded-sm bg-transparent transition-colors hover:bg-primary/60 ${edgeClass}`}
        onPointerDown={startResize}
        role="separator"
        aria-orientation={resize === "left" || resize === "right" ? "vertical" : "horizontal"}
      />
      {children}
    </section>
  );
}
