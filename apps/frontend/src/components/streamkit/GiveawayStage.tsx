import type { Giveaway, GiveawayParticipant } from "@streamkit/contracts";
import { CircleUserRound, Gift } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { selectBoundedItems } from "@/modules/performance/bounded-render-window";

const WHEEL_COLORS = [
  "#3369E8",
  "#D50F25",
  "#EEB211",
  "#009925",
  "#9B51E0",
  "#00A8E8",
  "#F58220",
  "#E83E8C",
] as const;

type GiveawayStageProps = {
  disabled: boolean;
  mode: Giveaway["mode"];
  onDraw(): void;
  participants: GiveawayParticipant[];
  phase: "idle" | "drawing" | "revealed";
  winner: string | null;
  targetWinner: string | null;
};

export function GiveawayStage({
  disabled,
  mode,
  onDraw,
  participants,
  phase,
  targetWinner,
}: GiveawayStageProps) {
  const visibleParticipants = selectBoundedItems(
    participants,
    (targetWinner && participants.find((item) => item.displayName === targetWinner)?.id) ?? null,
  );
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onDraw}
      aria-label={phase === "drawing" ? "Sorteio em andamento" : "Iniciar sorteio"}
      className="relative flex h-full min-h-[430px] w-full items-center justify-center overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
    >
      {mode === "wheel" ? (
        <WheelStage
          participants={visibleParticipants}
          spinning={phase === "drawing"}
          winner={targetWinner}
        />
      ) : (
        <CaseStage
          participants={visibleParticipants}
          rolling={phase === "drawing"}
          winner={targetWinner}
        />
      )}
      {phase === "idle" && participants.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/55 text-muted-foreground backdrop-blur-sm">
          <Gift className="size-10" />
          <span className="text-sm">Adicione participantes para começar</span>
        </div>
      )}
      {phase !== "drawing" && participants.length > 0 && (
        <span className="pointer-events-none absolute bottom-5 rounded-full bg-background/75 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
          Clique na roleta para sortear
        </span>
      )}
    </button>
  );
}

function WheelStage({
  participants,
  spinning,
  winner,
}: {
  participants: GiveawayParticipant[];
  spinning: boolean;
  winner: string | null;
}) {
  const labels = participants;
  const [rotation, setRotation] = useState(0);
  const [pointerColor, setPointerColor] = useState<string>(WHEEL_COLORS[0]);
  const previousSpinning = useRef(false);
  const wheelRef = useRef<SVGGElement>(null);
  const slice = labels.length ? 360 / labels.length : 360;

  useEffect(() => {
    if (!spinning || previousSpinning.current || !winner || !labels.length) {
      previousSpinning.current = spinning;
      return;
    }
    const winnerIndex = labels.findIndex((participant) => participant.displayName === winner);
    if (winnerIndex < 0) return;
    setRotation((current) => {
      const random = crypto.getRandomValues(new Uint32Array(2));
      const turns = 7 + ((random[0] ?? 0) % 4);
      const landingRatio = 0.15 + ((random[1] ?? 0) / 0xffffffff) * 0.7;
      const landingAngle = -90 + (winnerIndex + landingRatio) * slice;
      const targetModulo = ((-landingAngle % 360) + 360) % 360;
      const currentModulo = ((current % 360) + 360) % 360;
      const alignment = (targetModulo - currentModulo + 360) % 360;
      return current + turns * 360 + alignment;
    });
    previousSpinning.current = true;
  }, [labels, slice, spinning, winner]);

  useEffect(() => {
    if (!spinning || !labels.length) return;
    let frame = 0;
    const updatePointer = () => {
      const transform = wheelRef.current ? getComputedStyle(wheelRef.current).transform : "none";
      const matrix = transform === "none" ? null : new DOMMatrixReadOnly(transform);
      const renderedRotation = matrix ? (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI : 0;
      const sourceAngle = (((-renderedRotation + 90) % 360) + 360) % 360;
      const index = Math.floor(sourceAngle / slice) % labels.length;
      setPointerColor(WHEEL_COLORS[index % WHEEL_COLORS.length] ?? WHEEL_COLORS[0]);
      frame = requestAnimationFrame(updatePointer);
    };
    frame = requestAnimationFrame(updatePointer);
    return () => cancelAnimationFrame(frame);
  }, [labels.length, slice, spinning]);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="0 0 38 34"
        aria-hidden="true"
        className="absolute -right-8 z-30 h-[34px] w-[38px] overflow-visible drop-shadow-md"
      >
        <path
          d="M 35 3 L 3 17 L 35 31 Z"
          fill={pointerColor}
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinejoin="round"
          className="transition-colors duration-75"
        />
      </svg>
      <svg
        viewBox="0 0 240 240"
        className="giveaway-wheel size-[min(48vw,52vh,430px)] min-h-72 min-w-72 overflow-visible rounded-full drop-shadow-[0_10px_28px_rgba(0,0,0,.3)]"
        aria-label={`Roleta com ${labels.length} participantes`}
      >
        <g
          ref={wheelRef}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "120px 120px",
            transition: spinning ? "transform 6.5s cubic-bezier(.08,.64,.06,1)" : "none",
          }}
        >
          {labels.length === 0 ? (
            <circle cx="120" cy="120" r="118" fill="#ffffff" />
          ) : (
            labels.map((participant, index) => {
              const startAngle = -90 + index * slice;
              const endAngle = startAngle + slice;
              const centerAngle = startAngle + slice / 2;
              const textPosition = polarPoint(
                120,
                120,
                labels.length > 14 ? 108 : 104,
                centerAngle,
              );
              const fontSize = Math.max(7, Math.min(15, 150 / labels.length + 5));
              return (
                <g key={participant.id}>
                  <path
                    d={wheelSlicePath(120, 120, 118, startAngle, endAngle)}
                    fill={WHEEL_COLORS[index % WHEEL_COLORS.length]}
                    stroke="var(--border-strong)"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  />
                  <text
                    x={textPosition.x}
                    y={textPosition.y}
                    fill="#ffffff"
                    fontSize={fontSize}
                    fontWeight="700"
                    textAnchor="end"
                    dominantBaseline="middle"
                    paintOrder="stroke"
                    stroke="rgba(0,0,0,.2)"
                    strokeWidth="1.5"
                    transform={`rotate(${centerAngle} ${textPosition.x} ${textPosition.y})`}
                  >
                    {truncateWheelLabel(participant.displayName, labels.length)}
                  </text>
                </g>
              );
            })
          )}
        </g>
        <circle
          cx="120"
          cy="120"
          r="118"
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="5"
        />
        <circle cx="120" cy="120" r="5" fill="#ffffff" />
      </svg>
    </div>
  );
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function wheelSlicePath(cx: number, cy: number, radius: number, start: number, end: number) {
  if (end - start >= 359.999) {
    return `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
  }
  const first = polarPoint(cx, cy, radius, start);
  const last = polarPoint(cx, cy, radius, end);
  return `M ${cx} ${cy} L ${first.x} ${first.y} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${last.x} ${last.y} Z`;
}

function truncateWheelLabel(label: string, participantCount: number) {
  const limit = participantCount > 16 ? 8 : participantCount > 10 ? 12 : 18;
  return label.length > limit ? `${label.slice(0, limit - 1)}…` : label;
}

function CaseStage({
  participants,
  rolling,
  winner,
}: {
  participants: GiveawayParticipant[];
  rolling: boolean;
  winner: string | null;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const previousRolling = useRef(false);
  const participantKey = participants.map((participant) => participant.id).join(":");
  const items = participants;
  const itemStep = 156;

  const centeredOffset = (index: number) =>
    (viewportRef.current?.clientWidth ?? 0) / 2 - index * itemStep - 72;

  useLayoutEffect(() => {
    if (!participants.length || !viewportRef.current) return;
    const initialIndex = 0;
    setOffset(centeredOffset(initialIndex));
  }, [participantKey]);

  useEffect(() => {
    if (!participants.length || !viewportRef.current) return;
    const winnerIndex = winner
      ? participants.findIndex((participant) => participant.displayName === winner)
      : -1;

    if (!rolling) {
      if (previousRolling.current && winnerIndex >= 0) {
        setOffset(centeredOffset(winnerIndex));
      }
      previousRolling.current = false;
      return;
    }
    if (previousRolling.current || winnerIndex < 0) return;

    const targetIndex = winnerIndex >= 0 ? winnerIndex : 0;
    setOffset(centeredOffset(targetIndex));
    previousRolling.current = true;
  }, [participantKey, rolling, winner]);

  return (
    <div ref={viewportRef} className="relative w-full overflow-hidden py-8">
      <div className="pointer-events-none absolute inset-y-3 left-1/2 z-10 w-px bg-primary" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div
        className="giveaway-case-track flex w-max gap-3"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: rolling ? "transform 9s cubic-bezier(.08,.64,.06,1)" : "none",
        }}
      >
        {items.map((participant, index) => (
          <div
            key={`${participant.id}-${index}`}
            className="flex h-28 w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 shadow-lg"
          >
            <CircleUserRound className="size-8 text-primary" />
            <span className="w-full truncate text-center text-xs font-semibold">
              {participant.displayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
