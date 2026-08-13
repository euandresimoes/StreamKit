import type {
  CreateGiveawayRequest,
  Giveaway,
  GiveawayDetail,
  GiveawayRound,
} from "@streamkit/contracts";
import { useCallback, useEffect, useState } from "react";

import { giveawayApi } from "./giveaway-api";

export function useGiveaways() {
  const [items, setItems] = useState<Giveaway[]>([]);
  const [detail, setDetail] = useState<GiveawayDetail | null>(null);
  const [history, setHistory] = useState<GiveawayRound[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (preferredId?: string) => {
    setError(null);
    try {
      const list = await giveawayApi.list();
      setItems(list.items);
      const id = preferredId ?? list.items[0]?.id;
      if (!id) {
        setDetail(null);
        setHistory([]);
        return;
      }
      const [nextDetail, nextHistory] = await Promise.all([
        giveawayApi.detail(id),
        giveawayApi.history(id),
      ]);
      setDetail(nextDetail);
      setHistory(nextHistory.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os sorteios.");
    }
  }, []);
  useEffect(() => void load(), [load]);

  const mutate = async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      await load(detail?.giveaway.id);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A operação não pôde ser concluída.");
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const continueCompletedRound = async (giveawayId: string) => {
    if (detail?.giveaway.status === "completed") {
      await giveawayApi.nextRound(giveawayId, false);
    }
  };

  return {
    items,
    detail,
    history,
    busy,
    error,
    refresh: () => load(detail?.giveaway.id),
    select: load,
    create: async (input: CreateGiveawayRequest) => {
      setBusy(true);
      try {
        const created = await giveawayApi.create(input);
        await load(created.id);
      } finally {
        setBusy(false);
      }
    },
    importParticipants: (input: string) =>
      detail
        ? mutate(async () => {
            await continueCompletedRound(detail.giveaway.id);
            return giveawayApi.import(detail.giveaway.id, input, detail.giveaway.duplicatePolicy);
          })
        : undefined,
    removeParticipant: (participantId: string) =>
      detail
        ? mutate(async () => {
            await continueCompletedRound(detail.giveaway.id);
            return giveawayApi.removeParticipant(detail.giveaway.id, participantId);
          })
        : undefined,
    updateMode: (mode: "wheel" | "case-opening") =>
      detail
        ? mutate(async () => {
            await continueCompletedRound(detail.giveaway.id);
            return giveawayApi.update(detail.giveaway.id, {
              maxParticipants: detail.giveaway.maxParticipants,
              mode,
              name: detail.giveaway.name,
            });
          })
        : undefined,
    draw: async () => {
      if (!detail) return;
      return mutate(async () => {
        await continueCompletedRound(detail.giveaway.id);
        if (detail.giveaway.status === "draft") await giveawayApi.prepare(detail.giveaway.id);
        return giveawayApi.draw(detail.giveaway.id);
      });
    },
    completeRound: (roundId: string) =>
      detail ? mutate(() => giveawayApi.complete(detail.giveaway.id, roundId)) : undefined,
    nextRound: () =>
      detail ? mutate(() => giveawayApi.nextRound(detail.giveaway.id, true)) : undefined,
    update: (name: string, mode: "wheel" | "case-opening", maxParticipants?: number) =>
      detail
        ? mutate(() =>
            giveawayApi.update(detail.giveaway.id, {
              maxParticipants: maxParticipants ?? detail.giveaway.maxParticipants,
              name,
              mode,
            }),
          )
        : undefined,
    delete: async () => {
      if (!detail) return;
      setBusy(true);
      setError(null);
      try {
        await giveawayApi.delete(detail.giveaway.id);
        setDetail(null);
        setHistory([]);
        await load();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível excluir o sorteio.");
      } finally {
        setBusy(false);
      }
    },
  };
}
