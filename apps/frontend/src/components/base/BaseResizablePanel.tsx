import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type PanelMode = "vertical" | "horizontal";
type ResizeEdge = "top" | "left" | "bottom" | "right";
type ResizeOption = ResizeEdge | "both-horizontal";

const STORAGE_PREFIX = "streamlet.panel-size.";
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

function edgeClassFor(edge: ResizeEdge) {
  return {
    top: "-top-1 left-0 right-0 h-3 cursor-ns-resize",
    left: "-left-1 top-0 bottom-0 w-3 cursor-ew-resize",
    bottom: "-bottom-1 left-0 right-0 h-3 cursor-ns-resize",
    right: "-right-1 top-0 bottom-0 w-3 cursor-ew-resize",
  }[edge];
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
  resize: ResizeOption;
}) {
  const [size, setSize] = useState(() => readSize(panelId, defaultSize, minSize, maxSize));
  const startRef = useRef<{ coordinate: number; edge: ResizeEdge; size: number } | null>(null);

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
      const coordinate =
        start.edge === "left" || start.edge === "right" ? event.clientX : event.clientY;
      const direction = start.edge === "left" || start.edge === "top" ? -1 : 1;
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
  }, [maxSize, minSize]);

  const startResize = (edge: ResizeEdge) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const coordinate = edge === "left" || edge === "right" ? event.clientX : event.clientY;
    startRef.current = { coordinate, edge, size };
    document.body.style.cursor = edge === "left" || edge === "right" ? "ew-resize" : "ns-resize";
    document.body.style.userSelect = "none";
  };

  const horizontalResize = resize === "left" || resize === "right" || resize === "both-horizontal";
  const sizeStyle = horizontalResize ? { width: size } : { height: size };

  const handles: ResizeEdge[] = resize === "both-horizontal" ? ["left", "right"] : [resize];

  return (
    <section
      className={`relative flex min-h-0 min-w-0 max-w-full overflow-hidden ${mode === "vertical" ? "flex-col" : "flex-row"} ${className}`}
      style={sizeStyle}
      data-panel-id={panelId}
    >
      {handles.map((edge) => (
        <div
          key={edge}
          aria-label={`Redimensionar painel ${panelId} pela borda ${edge}`}
          className={`absolute z-50 touch-none select-none rounded-sm bg-transparent transition-colors hover:bg-primary/60 ${edgeClassFor(edge)}`}
          onPointerDown={startResize(edge)}
          role="separator"
          aria-orientation={edge === "left" || edge === "right" ? "vertical" : "horizontal"}
        />
      ))}
      {children}
    </section>
  );
}
