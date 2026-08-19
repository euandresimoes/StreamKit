import { Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BaseModal } from "@/components/base/BaseModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ParticipantImportModal({
  open,
  onOpenChange,
  busy = false,
  locked = false,
  onImport,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  busy?: boolean;
  locked?: boolean;
  onImport(input: string): Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("giveaway.importTitle")}
      description={t("giveaway.importDescription")}
    >
      <Textarea
        value={input}
        disabled={busy || locked}
        onChange={(event) => setInput(event.target.value)}
        placeholder={"Maria\nJohn\nAna"}
        className="min-h-56 resize-none text-[13px]"
      />
      <div className="mt-4 flex justify-end">
        <Button
          disabled={!input.trim() || busy || locked}
          onClick={async () => {
            if (await onImport(input)) {
              setInput("");
              onOpenChange(false);
            }
          }}
        >
          <Users /> {t("giveaway.importTitle")}
        </Button>
      </div>
    </BaseModal>
  );
}
