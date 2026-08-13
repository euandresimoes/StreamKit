import type {
  GiveawayCaptureRule,
  IntegrationConnection,
  SaveGiveawayCaptureRuleRequest,
} from "@streamkit/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { integrationApi } from "@/modules/integration/integration-api";
import { giveawayApi } from "./giveaway-api";

export function useGiveawayCaptureRules(giveawayId: string, onRefresh: () => Promise<void>) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const [rules, setRules] = useState<GiveawayCaptureRule[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [nextRules, nextConnections] = await Promise.all([
        giveawayApi.captureRules(giveawayId),
        integrationApi.listConnections(),
      ]);
      setRules(nextRules.items);
      setConnections(nextConnections.filter((item) => item.capabilities.includes("chat.read")));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a captura.");
    }
  }, [giveawayId]);
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
    remove: (ruleId: string) => mutate(() => giveawayApi.deleteCaptureRule(giveawayId, ruleId)),
    save: (input: SaveGiveawayCaptureRuleRequest) =>
      mutate(() => giveawayApi.saveCaptureRule(giveawayId, input)),
    setStatus: (ruleId: string, status: GiveawayCaptureRule["status"]) =>
      mutate(() => giveawayApi.updateCaptureRule(giveawayId, ruleId, status)),
  };
}
