type Translate = (key: string, options?: Record<string, unknown>) => string;

export function captureButtonLabel(
  active: boolean,
  participantCount: number,
  temporarilyPaused = false,
  translate?: Translate,
): string {
  if (active && temporarilyPaused) return translate?.("live.capturePaused") ?? "Capture paused";
  if (!active) return translate?.("live.startCapture") ?? "Start capture";
  return (
    translate?.("live.capturingParticipants", { count: participantCount }) ??
    `Capturing (${participantCount} participants)`
  );
}
