import type {
  GiveawayCaptureRule,
  IntegrationConnection,
  SaveGiveawayCaptureRuleRequest,
  TournamentCaptureRule,
} from "@streamkit/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { giveawayApi } from "@/modules/giveaway/giveaway-api";
import { tournamentApi } from "@/modules/tournament/tournament-api";
import { integrationApi } from "./integration-api";

type CaptureRule = GiveawayCaptureRule | TournamentCaptureRule;
type CaptureTarget = "giveaway" | "tournament";

export function useParticipantCaptureRules(
  target: CaptureTarget,
  targetId: string,
  onRefresh: () => Promise<void>,
) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const [rules, setRules] = useState<CaptureRule[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [nextRules, nextConnections] = await Promise.all([
        target === "giveaway"
          ? giveawayApi.captureRules(targetId)
          : tournamentApi.captureRules(targetId),
        integrationApi.listConnections(),
      ]);
      setRules(nextRules.items);
      setConnections(nextConnections.filter((item) => item.capabilities.includes("chat.read")));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a captura.");
    }
  }, [target, targetId]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void Promise.all([load(), onRefreshRef.current()]);
    }, 2_000);
    return () => clearInterval(timer);
  }, [load]);
  const mutate = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      await load();
      await onRefreshRef.current();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a captura.");
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    connections,
    error,
    rules,
    remove: (ruleId: string) =>
      mutate(() =>
        target === "giveaway"
          ? giveawayApi.deleteCaptureRule(targetId, ruleId)
          : tournamentApi.deleteCaptureRule(targetId, ruleId),
      ),
    save: (input: SaveGiveawayCaptureRuleRequest) =>
      mutate(() =>
        target === "giveaway"
          ? giveawayApi.saveCaptureRule(targetId, input)
          : tournamentApi.saveCaptureRule(targetId, { ...input, entryPolicy: "unique" }),
      ),
    setStatus: (ruleId: string, status: CaptureRule["status"]) =>
      mutate(() =>
        target === "giveaway"
          ? giveawayApi.updateCaptureRule(targetId, ruleId, status)
          : tournamentApi.updateCaptureRule(targetId, ruleId, status),
      ),
  };
}
