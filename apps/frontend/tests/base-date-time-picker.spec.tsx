import { renderToStaticMarkup } from "react-dom/server";

import { BaseDateTimePicker } from "@/components/base/BaseDateTimePicker";

describe("BaseDateTimePicker", () => {
  it("renders an accessible compact dropdown trigger", () => {
    const markup = renderToStaticMarkup(
      <BaseDateTimePicker
        ariaLabel="Capture start"
        placeholder="Start now"
        value=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Capture start"');
    expect(markup).toContain("Start now");
    expect(markup).toContain('aria-haspopup="dialog"');
  });
});
