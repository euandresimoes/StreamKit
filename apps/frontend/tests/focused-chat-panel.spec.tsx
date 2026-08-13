import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { FocusedChatPanel } from "@/components/streamkit/FocusedChatPanel";

describe("FocusedChatPanel accessibility", () => {
  it("exposes the panel, live log and labelled controls without depending on color", () => {
    const markup = renderToStaticMarkup(
      <FocusedChatPanel target="giveaways" targetId="00000000-0000-4000-8000-000000000001" />,
    );

    expect(markup).toContain('aria-label="Chat focado"');
    expect(markup).toContain('role="log"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="Fechar chat"');
    expect(markup).toContain('aria-label="Responder no chat"');
    expect(markup).toContain('aria-label="Enviar mensagem"');
    expect(markup).toContain("Carregando mensagens");
  });

  it("supports both system and persisted reduced-motion preferences", async () => {
    const styles = await readFile(join(__dirname, "../src/styles.css"), "utf8");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain('html[data-reduce-motion="true"]');
  });
});
