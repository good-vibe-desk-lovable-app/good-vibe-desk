import { it } from "vitest";
import { PALS, resolveChild } from "@/data/palworld";
it("closure", () => {
  let R = new Set([1,2,3]);
  for (let round=0; round<8; round++) {
    const arr=[...R];
    for (const a of arr) for (const b of arr) { const r=resolveChild(a,b); if (r) R.add(r.childId); }
    console.log(round, R.size, R.has(37));
  }
  console.log("total pals", PALS.length);
});
