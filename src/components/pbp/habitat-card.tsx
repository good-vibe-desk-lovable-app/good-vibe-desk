// Where to get a Pal — Part 6 surface for the habitat data and the hand-maintained
// acquisition channels. There is no "breed only" badge: it is not a real category.
import { MapPin, Moon, ShieldCheck, Sun } from "lucide-react";

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
        <span className="font-medium">How to get {pal.name}</span>
        <Badge
          variant={info.channel === "unknown" ? "outline" : "secondary"}
          className="text-[10px]"
        >
          {info.label}
        </Badge>
        {info.guaranteedCapture ? (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <ShieldCheck className="size-3" /> Guaranteed capture
          </Badge>
        ) : null}
        {nocturnal ? (
          <Badge variant="outline" className="text-[10px]">
            Nocturnal
          </Badge>
        ) : null}
      </div>

      <p className="mt-2 text-xs">{info.requirement}</p>
      {info.sourceTier ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Source: {info.sourceTier === 1 ? "datamine (tier 1)" : "guide sites (tier 3)"}
        </p>
      ) : null}

      {info.notes.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
          {info.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      {info.windows.length > 0 ? (
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
            Level ranges and alpha variants aren't in the sourced data unless listed above, so
            they're not shown rather than guessed.
          </p>
        </>
      ) : null}
    </div>
  );
}
