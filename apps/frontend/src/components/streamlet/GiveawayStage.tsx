import type { Giveaway, GiveawayParticipant } from "@streamlet/contracts";
import { CircleUserRound, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  MAX_VISIBLE_WHEEL_PARTICIPANTS,
  selectRandomSampledItems,
} from "@/modules/performance/bounded-render-window";
import { playGiveawayTick, playGiveawayWinner } from "./giveaway-audio";

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

export const GIVEAWAY_WHEEL_SPIN_DURATION_MS = 8_500;

type GiveawayStageProps = {
  disabled: boolean;
  mode: Giveaway["mode"];
  onDraw(): void;
  participants: GiveawayParticipant[];
  phase: "idle" | "drawing" | "revealed";
  targetWinnerId: string | null;
};

export function GiveawayStage({
  disabled,
  mode,
  onDraw,
  participants,
  phase,
  targetWinnerId,
}: GiveawayStageProps) {
  const { t } = useTranslation();
  const sampledParticipants = useMemo(
    () => selectRandomSampledItems(participants, null, MAX_VISIBLE_WHEEL_PARTICIPANTS),
    [participants],
  );
  const visibleParticipants = useMemo(() => {
    if (!targetWinnerId || sampledParticipants.some((item) => item.id === targetWinnerId))
      return sampledParticipants;
    const winner = participants.find((item) => item.id === targetWinnerId);
    return winner ? [...sampledParticipants.slice(0, -1), winner] : sampledParticipants;
  }, [participants, sampledParticipants, targetWinnerId]);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onDraw}
      aria-label={phase === "drawing" ? t("giveaway.inProgress") : t("giveaway.start")}
      className="relative flex h-full min-h-[430px] w-full items-center justify-center overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
    >
      {mode === "wheel" ? (
        <WheelStage
          participants={visibleParticipants}
          spinning={phase === "drawing"}
          winnerId={targetWinnerId}
        />
      ) : (
        <CaseStage
          participants={visibleParticipants}
          rolling={phase === "drawing"}
          winnerId={targetWinnerId}
        />
      )}
      {phase === "idle" && participants.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/55 text-muted-foreground backdrop-blur-sm">
          <Gift className="size-10" />
          <span className="text-sm">{t("giveaway.addParticipantsToBegin")}</span>
        </div>
      )}
      {phase !== "drawing" && participants.length > 0 && (
        <span className="pointer-events-none absolute bottom-5 rounded-full bg-background/75 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
          {t("giveaway.clickToDraw")}
        </span>
      )}
    </button>
  );
}

function WheelStage({
  participants,
  spinning,
  winnerId,
}: {
  participants: GiveawayParticipant[];
  spinning: boolean;
  winnerId: string | null;
}) {
  const labels = participants;
  const showLabels = labels.length <= 150;
  const [rotation, setRotation] = useState(0);
  const [pointerColor, setPointerColor] = useState<string>(WHEEL_COLORS[0]);
  const previousSpinning = useRef(false);
  const previousPointerIndex = useRef(-1);
  const wheelRef = useRef<SVGGElement>(null);
  const slice = labels.length ? 360 / labels.length : 360;

  useEffect(() => {
    if (!spinning || previousSpinning.current || !winnerId || !labels.length) {
      previousSpinning.current = spinning;
      return;
    }
    const winnerIndex = labels.findIndex((participant) => participant.id === winnerId);
    if (winnerIndex < 0) return;
    setRotation((current) => {
      const random = crypto.getRandomValues(new Uint32Array(2));
      const turns = 10 + ((random[0] ?? 0) % 5);
      const landingRatio = 0.15 + ((random[1] ?? 0) / 0xffffffff) * 0.7;
      const landingAngle = -90 + (winnerIndex + landingRatio) * slice;
      const targetModulo = ((-landingAngle % 360) + 360) % 360;
      const currentModulo = ((current % 360) + 360) % 360;
      const alignment = (targetModulo - currentModulo + 360) % 360;
      return current + turns * 360 + alignment;
    });
    previousSpinning.current = true;
  }, [labels, slice, spinning, winnerId]);

  useEffect(() => {
    if (!labels.length) return;
    if (!spinning) {
      const winnerIndex = winnerId
        ? labels.findIndex((participant) => participant.id === winnerId)
        : -1;
      if (winnerIndex >= 0)
        setPointerColor(WHEEL_COLORS[winnerIndex % WHEEL_COLORS.length] ?? WHEEL_COLORS[0]);
      return;
    }
    let frame = 0;
    const updatePointer = () => {
      const transform = wheelRef.current ? getComputedStyle(wheelRef.current).transform : "none";
      const matrix = transform === "none" ? null : new DOMMatrixReadOnly(transform);
      const renderedRotation = matrix ? (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI : 0;
      const sourceAngle = (((-renderedRotation + 90) % 360) + 360) % 360;
      const index = Math.floor(sourceAngle / slice) % labels.length;
      setPointerColor(WHEEL_COLORS[index % WHEEL_COLORS.length] ?? WHEEL_COLORS[0]);
      if (index !== previousPointerIndex.current) {
        previousPointerIndex.current = index;
        playGiveawayTick();
      }
      frame = requestAnimationFrame(updatePointer);
    };
    frame = requestAnimationFrame(updatePointer);
    return () => cancelAnimationFrame(frame);
  }, [labels.length, slice, spinning, winnerId]);

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
        aria-label={`Wheel with ${labels.length} participants`}
      >
        <g
          ref={wheelRef}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "120px 120px",
            transition: spinning
              ? `transform ${GIVEAWAY_WHEEL_SPIN_DURATION_MS}ms cubic-bezier(.05,.72,.08,1)`
              : "none",
          }}
          onTransitionEnd={() => {
            if (!winnerId) return;
            const winnerIndex = labels.findIndex((participant) => participant.id === winnerId);
            if (winnerIndex >= 0)
              setPointerColor(WHEEL_COLORS[winnerIndex % WHEEL_COLORS.length] ?? WHEEL_COLORS[0]);
            playGiveawayWinner();
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
                  {showLabels && (
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
                  )}
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
  winnerId,
}: {
  participants: GiveawayParticipant[];
  rolling: boolean;
  winnerId: string | null;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const previousRolling = useRef(false);
  const participantKey = participants.map((participant) => participant.id).join(":");
  const items = useMemo(() => shuffleParticipants(participants), [participantKey]);
  const itemStep = 156;
  const loopCount = items.length > 150 ? 4 : 6;
  const trackItems = useMemo(
    () => Array.from({ length: loopCount }, () => items).flat(),
    [items, loopCount],
  );

  const centeredOffset = (index: number) =>
    (viewportRef.current?.clientWidth ?? 0) / 2 - index * itemStep - 72;

  useLayoutEffect(() => {
    if (rolling || !items.length || !viewportRef.current) return;
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const randomIndex = items.length > 2 ? 1 + (random[0]! % (items.length - 2)) : 0;
    const initialIndex = items.length + randomIndex;
    setOffset(centeredOffset(initialIndex));
  }, [items, participantKey]);

  useEffect(() => {
    if (!items.length || !viewportRef.current) return;
    const winnerIndex = winnerId
      ? items.findIndex((participant) => participant.id === winnerId)
      : -1;

    if (!rolling) {
      previousRolling.current = false;
      return;
    }
    if (previousRolling.current || winnerIndex < 0) return;

    const targetIndex =
      winnerIndex >= 0 ? items.length * (loopCount - 2) + winnerIndex : items.length * 2;
    setOffset(centeredOffset(targetIndex));
    previousRolling.current = true;
  }, [items, loopCount, participantKey, rolling, winnerId]);

  return (
    <div ref={viewportRef} className="relative w-full overflow-hidden py-8">
      <div className="pointer-events-none absolute inset-y-3 left-1/2 z-10 w-px bg-border-strong" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div
        className="giveaway-case-track flex w-max gap-3"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: rolling ? "transform 9s cubic-bezier(.08,.64,.06,1)" : "none",
        }}
      >
        {trackItems.map((participant, index) => (
          <div
            key={`${participant.id}-${index}`}
            className="flex h-28 w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 shadow-lg"
          >
            <CircleUserRound className="size-8 text-yellow-400" />
            <span className="w-full truncate text-center text-xs font-semibold">
              {participant.displayName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function shuffleParticipants(participants: readonly GiveawayParticipant[]) {
  const shuffled = [...participants];
  const randomValues = new Uint32Array(Math.max(0, shuffled.length - 1));
  if (randomValues.length) crypto.getRandomValues(randomValues);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = randomValues[shuffled.length - 1 - index]! % (index + 1);
    const current = shuffled[index]!;
    shuffled[index] = shuffled[randomIndex]!;
    shuffled[randomIndex] = current;
  }
  return shuffled;
}
