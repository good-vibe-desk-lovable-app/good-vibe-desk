import { describe, expect, it } from "vitest";

import type { Passive } from "@/data/palworld";
import { effectSign } from "../passive-visuals";

function passive(description: string): Passive {
  return { id: "fixture", name: "Fixture", description, tier: "common" };
}

describe("effectSign", () => {
  it("labels a single explicit positive percentage as positive", () => {
    expect(effectSign(passive("Work Speed +20%"))).toBe("positive");
  });

  it("labels a single explicit negative percentage as negative", () => {
    expect(effectSign(passive("Defense -10%"))).toBe("negative");
  });

  it("leaves mixed-sign trade-offs neutral rather than asserting a polarity", () => {
    expect(effectSign(passive("Movement Speed +10%, Work Speed -30%"))).toBe("neutral");
  });

  it("leaves context-dependent signed phrases neutral", () => {
    expect(effectSign(passive("SAN drops +10.0% faster."))).toBe("neutral");
  });

  it("leaves a direct stat paired with a context-dependent sign neutral", () => {
    expect(effectSign(passive("Work Speed +90% SAN decreases +15.0% faster"))).toBe("neutral");
  });

  it("leaves prose-only effects neutral", () => {
    expect(effectSign(passive("Increases the strength of your mounted attacks."))).toBe("neutral");
  });
});
