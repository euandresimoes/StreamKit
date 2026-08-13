import { renderToStaticMarkup } from "react-dom/server";

import { BaseDateTimePicker } from "@/components/base/BaseDateTimePicker";

describe("BaseDateTimePicker", () => {
  it("renders an accessible compact dropdown trigger", () => {
    const markup = renderToStaticMarkup(
      <BaseDateTimePicker
        ariaLabel="Início da coleta"
        placeholder="Começar agora"
        value=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Início da coleta"');
    expect(markup).toContain("Começar agora");
    expect(markup).toContain('aria-haspopup="dialog"');
  });
});
