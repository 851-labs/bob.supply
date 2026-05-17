import { describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { BobAvatar } from "./index";

describe("BobAvatar", () => {
  it("renders a Bob avatar image URL for a seed", () => {
    const markup = renderToStaticMarkup(<BobAvatar seed="alice" />);

    expect(markup).toContain('<img src="https://bob.supply/alice?format=png" alt="alice avatar"/>');
  });

  it("passes through image props", () => {
    const markup = renderToStaticMarkup(
      <BobAvatar seed="alice" alt="Alice" className="avatar" width={64} height={64} />,
    );

    expect(markup).toContain('class="avatar"');
    expect(markup).toContain('width="64"');
    expect(markup).toContain('height="64"');
    expect(markup).toContain('src="https://bob.supply/alice?format=png"');
    expect(markup).toContain('alt="Alice"');
  });
});
