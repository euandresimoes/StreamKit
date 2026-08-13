export function captureButtonLabel(active: boolean, participantCount: number): string {
  return active ? `Capturando (${participantCount} participantes)` : "Iniciar captura";
}
