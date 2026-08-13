export type GiveawayDrawPhase = "idle" | "drawing" | "revealed";

export function shouldShowGiveawayFocusedChat(
  phase: GiveawayDrawPhase,
  winner: string | null,
  completedAt: string | null | undefined,
): boolean {
  return phase === "revealed" && Boolean(winner) && Boolean(completedAt);
}
