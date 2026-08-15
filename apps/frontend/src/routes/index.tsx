import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/i18n";
import { AppShell } from "@/components/streamkit/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: i18n.t("routes.pageTitle") },
      {
        name: "description",
        content: i18n.t("routes.pageDescription"),
      },
      { property: "og:title", content: i18n.t("routes.socialTitle") },
      {
        property: "og:description",
        content: i18n.t("routes.socialDescription"),
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppShell,
});
