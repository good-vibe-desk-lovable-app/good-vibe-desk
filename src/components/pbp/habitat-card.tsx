// Where to catch a Pal — Part 6 surface for the generated habitat data.
import { MapPin, Moon, Sun } from "lucide-react";

import { acquisitionOf } from "@/lib/acquisition";
import { PAL_STATS } from "@/data/palworld/stats";
import type { Pal } from "@/data/palworld";
import { Badge } from "@/components/ui/badge";

export function HabitatCard({ pal }: { pal: Pal }) {
  const info = acquisitionOf(pal.internalName);
  const nocturnal = PAL_STATS[pal.internalName]?.nocturnal ?? false;

  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="size-4 text-primary" />
        <span className="font-medium">Where to find {pal.name}</span>
        {info.kind === "field" ? (
          <Badge variant="secondary" className="text-[10px]">
            Catchable in the wild
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            Acquisition unknown
          </Badge>
        )}
        {nocturnal ? (
          <Badge variant="outline" className="text-[10px]">
            Nocturnal
          </Badge>
        ) : null}
      </div>

      {info.kind === "field" ? (
        <>
          <ul className="mt-2 space-y-1 text-xs">
            {info.windows.map((w) => (
              <li key={w.map} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{w.map}</span>
                <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                  <Sun className="size-3" /> {w.day}
                </span>
                <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                  <Moon className="size-3" /> {w.night}
                </span>
              </li>
            ))}
          </ul>
          {info.areas.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Named areas: {info.areas.slice(0, 6).join(", ")}
              {info.areas.length > 6 ? "…" : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Region names weren't sourceable for this Pal — only spawn-point counts are known.
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Level ranges and alpha variants aren't in the sourced data, so they're not shown rather
            than guessed.
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{info.reason}</p>
      )}
    </div>
  );
}
