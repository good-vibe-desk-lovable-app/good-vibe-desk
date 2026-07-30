import { it } from "vitest";
import { search } from "../core";
import { deps } from "../pathfinder";
it("counts", () => {
  const coll = [
    { instanceId: "i1", palId: 1, gender: "male" as const, passiveIds: ["Legend"] },
    { instanceId: "i2", palId: 2, gender: "female" as const, passiveIds: ["Noukin"] },
    { instanceId: "i3", palId: 3, gender: "unknown" as const, passiveIds: ["Rare"] },
  ];
  let calls = 0; const species = new Set<number>();
  const wrapped = { ...deps, resolve: (a: number, b: number) => { calls++; const r = deps.resolve(a,b); if (r) species.add(r.childId); return r; } };
  const res = search(wrapped, 37, coll, ["i1","i2","i3"], { timeoutMs: 5000 });
  console.log("resolveCalls", calls, "speciesSeen", species.size, "has37", species.has(37), res.status);
});
