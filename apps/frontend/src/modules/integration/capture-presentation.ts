export function captureButtonLabel(
  active: boolean,
  participantCount: number,
  temporarilyPaused = false,
): string {
  if (active && temporarilyPaused) return "Capture paused";
  return active ? `Capturing (${participantCount} participants)` : "Start capture";
}
