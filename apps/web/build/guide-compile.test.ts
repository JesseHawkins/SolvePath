import { describe, expect, it } from "vitest";
import { compileGuidePage } from "./guide-compile";

describe("compileGuidePage", () => {
  it("turns {#id} on headings into anchors and hides it from the text", async () => {
    const page = await compileGuidePage(
      "timer",
      "# Timer {#guide.timer}\n\nIntro.\n\n## Inspection {#timer.inspection}\n\nYou get 15 seconds.\n",
    );
    expect(page.title).toBe("Timer");
    expect(page.html).toContain('<h2 id="timer.inspection">Inspection</h2>');
    expect(page.html).not.toContain("{#");
    expect(page.sections).toEqual([
      { anchor: "guide.timer", title: "Timer", text: "Intro." },
      { anchor: "timer.inspection", title: "Inspection", text: "You get 15 seconds." },
    ]);
  });

  it("drops raw HTML so Guide files can't inject scripts", async () => {
    const page = await compileGuidePage("x", "# X {#x}\n\n<script>alert(1)</script>\n\nHello\n");
    expect(page.html).not.toContain("<script");
    expect(page.html).toContain("Hello");
  });

  it("requires a top-level title", async () => {
    await expect(compileGuidePage("x", "## Only a subheading\n")).rejects.toThrow(/Title/);
  });
});
