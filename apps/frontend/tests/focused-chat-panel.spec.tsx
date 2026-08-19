import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { FocusedChatPanel } from "@/components/streamlet/FocusedChatPanel";

describe("FocusedChatPanel accessibility", () => {
  it("exposes the panel, live log and labelled controls without depending on color", () => {
    const markup = renderToStaticMarkup(
      <FocusedChatPanel target="giveaways" targetId="00000000-0000-4000-8000-000000000001" />,
    );

    expect(markup).toContain('aria-label="Focused chat"');
    expect(markup).toContain('role="log"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="Close chat"');
    expect(markup).toContain('aria-label="Reply in chat"');
    expect(markup).toContain('aria-label="Send message"');
    expect(markup).toContain("Loading messages");
    expect(markup).not.toContain("Real-time · local history from the last 24 hours");
  });

  it("supports both system and persisted reduced-motion preferences", async () => {
    const styles = await readFile(join(__dirname, "../src/styles.css"), "utf8");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain('html[data-reduce-motion="true"]');
  });
});
