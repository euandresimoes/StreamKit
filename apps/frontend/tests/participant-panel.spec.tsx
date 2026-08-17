import { renderToStaticMarkup } from "react-dom/server";

import { ParticipantPanel } from "@/components/streamkit/ParticipantPanel";

describe("ParticipantPanel", () => {
  it("renders LivePix amount before both provider badges and uses initials without an avatar", () => {
    const markup = renderToStaticMarkup(
      <ParticipantPanel
        participants={[
          {
            avatarUrl: null,
            displayName: "Vaurvik",
            id: "participant-1",
            livepixAmountInCents: 200,
            livepixCurrency: "BRL",
            provider: "kick",
            source: "livepix",
          },
        ]}
        expanded
        onToggle={() => undefined}
        participantName=""
        onParticipantNameChange={() => undefined}
        onAddParticipant={() => undefined}
        onRemoveParticipant={() => undefined}
        busy={false}
        locked={false}
      />,
    );

    expect(markup).toContain(">VA<");
    expect(markup).toContain("R$2.00");
    expect(markup).toContain('alt="LivePix"');
    expect(markup).toContain('alt="Kick"');
    expect(markup.indexOf("R$2.00")).toBeLessThan(markup.indexOf('alt="LivePix"'));
  });
});
