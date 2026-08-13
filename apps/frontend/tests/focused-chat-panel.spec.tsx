import { renderToStaticMarkup } from "react-dom/server";

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
  });
});
