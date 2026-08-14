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

function readSize(panelId: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(`${STORAGE_PREFIX}${panelId}`));
  return Number.isFinite(value) && value > 0 ? value : fallback;
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
  const [size, setSize] = useState(() => readSize(panelId, defaultSize));
  const startRef = useRef<{ coordinate: number; size: number } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(`${STORAGE_PREFIX}${panelId}`, String(size));
    onSizeChange?.(size);
  }, [onSizeChange, panelId, size]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      const coordinate = resize === "left" || resize === "right" ? event.clientX : event.clientY;
      const direction = resize === "left" || resize === "top" ? -1 : 1;
      const next = Math.min(
        maxSize,
        Math.max(minSize, start.size + (coordinate - start.coordinate) * direction),
      );
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
    top: "-top-1 left-0 right-0 h-2 cursor-ns-resize",
    left: "-left-1 top-0 bottom-0 w-2 cursor-ew-resize",
    bottom: "-bottom-1 left-0 right-0 h-2 cursor-ns-resize",
    right: "-right-1 top-0 bottom-0 w-2 cursor-ew-resize",
  }[resize];

  return (
    <section
      className={`relative flex min-h-0 min-w-0 overflow-hidden ${mode === "vertical" ? "flex-col" : "flex-row"} ${className}`}
      style={sizeStyle}
      data-panel-id={panelId}
    >
      <div
        aria-label={`Redimensionar painel ${panelId}`}
        className={`absolute z-20 rounded-sm bg-transparent transition-colors hover:bg-primary/60 ${edgeClass}`}
        onPointerDown={startResize}
        role="separator"
      />
      {children}
    </section>
  );
}
