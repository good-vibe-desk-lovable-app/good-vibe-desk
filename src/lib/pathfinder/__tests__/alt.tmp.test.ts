import { describe, it } from "vitest";
import { findBreedingChain } from "@/lib/pathfinder/pathfinder";
import { PALS } from "@/data/palworld";
describe("alt", () => {
  it("logs", () => {
    const col = [
      { instanceId: "a", palId: 1, gender: "male" as const, passiveIds: ["x"] },
      { instanceId: "b", palId: 10, gender: "female" as const, passiveIds: ["y"] },
      { instanceId: "c", palId: 25, gender: "male" as const, passiveIds: ["z"] },
    ];
    const t = PALS.find((p) => p.name === "Jormuntide")!.id;
    const r1 = findBreedingChain(t, col, ["a", "b", "c"]);
    console.log("r1", r1.status, r1.steps.length, r1.steps.map(s=>`${s.parent1}+${s.parent2}`).join("|"));
    const last = r1.steps[r1.steps.length-1];
    const r2 = findBreedingChain(t, col, ["a","b","c"], { forbidFinalPair: [last.parent1, last.parent2] });
    console.log("r2", r2.status, r2.steps.length, r2.steps.map(s=>`${s.parent1}+${s.parent2}`).join("|"));
  });
});
