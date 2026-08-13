import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/streamkit/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreamKit — Todo, torneios e sorteios para streamers" },
      {
        name: "description",
        content:
          "StreamKit é o app desktop para streamers: todo list kanban, torneios com chaveamento e sorteios em roleta ou caixa.",
      },
      { property: "og:title", content: "StreamKit — Painel do streamer" },
      {
        property: "og:description",
        content: "Kanban de tarefas, torneios individuais ou por equipe e sorteios ao vivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppShell,
});
