import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ParticipantChatCapturePanel } from "./GiveawayChatCapturePanel";

export function ParticipantCaptureDialog({
  open,
  onOpenChange,
  target,
  targetId,
  participantCount,
  temporarilyPaused,
  onRefresh,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  target: "giveaway" | "tournament";
  targetId: string;
  participantCount: number;
  temporarilyPaused?: boolean;
  onRefresh(): Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-h-[85vh] max-w-lg border-border-strong bg-popover/95">
        <DialogHeader>
          <DialogTitle>Capturar participantes do chat</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto py-2">
          <ParticipantChatCapturePanel
            target={target}
            targetId={targetId}
            participantCount={participantCount}
            {...(temporarilyPaused === undefined ? {} : { temporarilyPaused })}
            onRefresh={onRefresh}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
