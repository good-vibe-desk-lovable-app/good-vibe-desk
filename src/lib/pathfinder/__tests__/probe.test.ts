import { it } from "vitest";
import { findBreedingChain } from "@/lib/pathfinder/pathfinder";
import { palById } from "@/data/palworld";
it("probe", () => {
  const coll = [
    { instanceId: "i1", palId: 1, gender: "male" as const, passiveIds: ["Legend"] },
    { instanceId: "i2", palId: 2, gender: "female" as const, passiveIds: ["Noukin"] },
    { instanceId: "i3", palId: 3, gender: "unknown" as const, passiveIds: ["Rare"] },
  ];
  for (const t of [37, 5, 100]) {
    const r = findBreedingChain(t, coll, ["i1","i2","i3"], { timeoutMs: 5000 });
    console.log(palById.get(t)?.name, r.status, r.steps.length, Math.round(r.elapsedMs),
      r.steps.map(s=>`${s.parent1}+${s.parent2}=${s.child}`).join(" | "));
  }
});
