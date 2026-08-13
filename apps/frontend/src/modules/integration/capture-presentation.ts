export function captureButtonLabel(
  active: boolean,
  participantCount: number,
  temporarilyPaused = false,
): string {
  if (active && temporarilyPaused) return "Captura pausada";
  return active ? `Capturando (${participantCount} participantes)` : "Iniciar captura";
}
