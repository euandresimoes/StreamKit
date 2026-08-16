import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";

import { getRouter } from "./router";
import i18n from "./i18n";
import "./styles.css";
import { publishNotification } from "./modules/notifications/notifications";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(i18n.t("errors.rootNotFound"));
}

const router = getRouter();

window.addEventListener("error", (event) => {
  publishNotification({
    level: "error",
    message: event.message || "An unexpected application error occurred.",
    title: i18n.t("notifications.applicationError"),
  });
});
window.addEventListener("unhandledrejection", (event) => {
  publishNotification({
    level: "error",
    message: event.reason instanceof Error ? event.reason.message : String(event.reason),
    title: i18n.t("notifications.unexpectedOperation"),
  });
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  </StrictMode>,
);
