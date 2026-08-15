import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";

import { getRouter } from "./router";
import i18n from "./i18n";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(i18n.t("errors.rootNotFound"));
}

const router = getRouter();

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
