import * as i18next from "i18next";
import { initReactI18next } from "react-i18next";
import enUS from "./en-US";
import ptBR from "./pt-BR";
import es from "./es";

export const defaultNS = "translation";

const i18n = (i18next as typeof i18next & { default?: typeof i18next }).default ?? i18next;

void i18n.use(initReactI18next).init({
  debug: false,
  defaultNS,
  fallbackLng: "en-US",
  interpolation: { escapeValue: false },
  lng: "en-US",
  ns: [defaultNS],
  resources: {
    "en-US": { [defaultNS]: enUS },
    "pt-BR": { [defaultNS]: ptBR },
    es: { [defaultNS]: es },
  },
});

export default i18n;
