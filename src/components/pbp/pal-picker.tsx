// Fast Pal picker: chips, an A–Z jump rail, favourites, recents and a
// virtualised list, so 299 rows stay usable one-handed on a narrow phone.
// Text search exists but is never required.
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Star } from "lucide-react";

import { PALS, SAME_SPECIES_ONLY } from "@/data/palworld";
import type { Pal } from "@/data/palworld";
import { PAL_ELEMENTS } from "@/data/palworld/elements";
import {
  CHANNEL_LABEL,
  acquisitionOf,
  channelsInUse,
  type AcquisitionChannel,
} from "@/lib/acquisition";

import { WORK_TYPES, workLevelOf } from "@/lib/tiers";
import { loadRecentPals, pushRecentPal } from "@/lib/recents";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PalIcon } from "./pal-icon";

export const ELEMENTS = [
  "Normal",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Ground",
  "Dark",
  "Dragon",
] as const;

const ROW_HEIGHT = 44;
const VIEWPORT = 264;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface PalPickerProps {
  selectedId: number | null;
  onSelect: (palId: number) => void;
  favorites: number[];
  onToggleFavorite: (palId: number) => void;
  ownedIds?: number[];
}

/**
 * Lowercased display names, built once. The search previously lowercased all
 * ~300 names on every keystroke; this is the hot path while typing.
 */
const LOWER_NAMES: Record<number, string> = Object.fromEntries(
  PALS.map((p) => [p.id, p.name.toLowerCase()]),
);

export function PalPicker({
  selectedId,
  onSelect,
  favorites,
  onToggleFavorite,
  ownedIds = [],
}: PalPickerProps) {
  const [query, setQuery] = useState("");
  const [elements, setElements] = useState<string[]>([]);
  const [works, setWorks] = useState<string[]>([]);
  const [acq, setAcq] = useState<AcquisitionChannel | "all">("all");
  const [recent, setRecent] = useState<number[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecentPals());
  }, []);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);

  const channels = useMemo(() => channelsInUse(), []);

  /**
   * Rank rather than merely filter. A name that STARTS with the query is what
   * the user meant; a substring hit elsewhere, or a dex-number match, is a
   * fallback. Plain .includes() with an alphabetical sort buried Vanwyrm
   * among every other name containing "va". -1 means no match.
   */
  const rankPal = (pal: Pal, q: string): number => {
    if (!q) return 0;
    const name = LOWER_NAMES[pal.id] ?? pal.name.toLowerCase();
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
    if (String(pal.palDexNo).startsWith(q)) return 3;
    if (pal.internalName.toLowerCase().includes(q)) return 4;
    return -1;
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched: Array<{ pal: Pal; rank: number }> = [];

    for (const p of PALS) {
      if (elements.length) {
        const own = PAL_ELEMENTS[p.internalName] ?? [];
        if (!elements.some((e) => own.includes(e))) continue;
      }
      if (works.length && !works.every((w) => workLevelOf(p, w) > 0)) continue;
      if (acq !== "all" && acquisitionOf(p.internalName).channel !== acq) continue;
      const rank = rankPal(p, q);
      if (rank < 0) continue;
      matched.push({ pal: p, rank });
    }

    // Chips narrow the pool; the query orders what survives. Alphabetical is
    // the tiebreak within a rank band so the list stays stable as you type.
    matched.sort((a, b) => a.rank - b.rank || a.pal.name.localeCompare(b.pal.name));
    return matched.map((m) => m.pal);
  }, [query, elements, works, acq]);

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 4);
  const end = Math.min(rows.length, start + Math.ceil(VIEWPORT / ROW_HEIGHT) + 8);
  const visible = rows.slice(start, end);

  function choose(pal: Pal) {
    onSelect(pal.id);
    setRecent(pushRecentPal(pal.id));
  }

  function jumpTo(letter: string) {
    const idx = rows.findIndex((p) => p.name.toUpperCase().startsWith(letter));
    if (idx < 0 || !listRef.current) return;
    listRef.current.scrollTop = idx * ROW_HEIGHT;
  }

  const quickRow = (label: string, ids: number[]) =>
    ids.length ? (
      <div className="flex items-start gap-2">
        <span className="mt-1 w-16 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="flex flex-wrap gap-1">
          {ids.map((id) => {
            const pal = PALS.find((p) => p.id === id);
            if (!pal) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => choose(pal)}
                className={cn(
                  "rounded-full border px-2 py-1 text-xs",
                  pal.id === selectedId
                    ? "border-primary bg-primary/15"
                    : "border-border/70 hover:bg-accent/60",
                )}
              >
                {pal.name}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (optional)"
          className="pl-9"
          aria-label="Search for a Pal"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {ELEMENTS.map((e) => (
          <Chip
            key={e}
            on={elements.includes(e)}
            onClick={() =>
              setElements((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]))
            }
          >
            {e}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {WORK_TYPES.map((w) => (
          <Chip
            key={w}
            on={works.includes(w)}
            onClick={() => setWorks((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]))}
          >
            {w}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        <Chip on={acq === "all"} onClick={() => setAcq("all")}>
          Any source
        </Chip>
        {channels.map((k) => (
          <Chip key={k} on={acq === k} onClick={() => setAcq(k)}>
            {CHANNEL_LABEL[k]}
          </Chip>
        ))}
      </div>

      {quickRow("Favourites", favorites)}
      {quickRow("Recent", recent)}

      <div className="flex gap-1">
        <div
          ref={listRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto rounded-lg border"
          style={{ height: VIEWPORT }}
        >
          <ul style={{ height: rows.length * ROW_HEIGHT, position: "relative" }}>
            {visible.map((pal, i) => {
              const top = (start + i) * ROW_HEIGHT;
              const info = acquisitionOf(pal.internalName);
              return (
                <li
                  key={pal.id}
                  className="absolute inset-x-0 flex items-center"
                  style={{ top, height: ROW_HEIGHT }}
                >
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(pal.id)}
                    aria-label={
                      favoriteSet.has(pal.id)
                        ? `Remove ${pal.name} from favourites`
                        : `Add ${pal.name} to favourites`
                    }
                    aria-pressed={favoriteSet.has(pal.id)}
                    className="rounded-md p-2 text-muted-foreground hover:text-warning"
                  >
                    <Star
                      className={cn(
                        "size-4",
                        favoriteSet.has(pal.id) ? "fill-warning text-warning" : "",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => choose(pal)}
                    className={cn(
                      "flex h-full flex-1 items-center gap-2 rounded-md px-2 text-left text-sm",
                      pal.id === selectedId
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-accent/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="w-10 shrink-0 text-xs tabular-nums opacity-70">
                      #{pal.palDexNo}
                    </span>
                    <PalIcon internalName={pal.internalName} name={pal.name} size={32} />
                    <span className="min-w-0 flex-1 truncate font-medium">{pal.name}</span>
                    {ownedSet.has(pal.id) ? (
                      <Badge variant="secondary" className="text-[10px]">
                        owned
                      </Badge>
                    ) : null}
                    {info.channel !== "wild_spawn" ? (
                      <Badge variant="outline" className="text-[10px]" title={info.requirement}>
                        {info.channel === "unknown" ? "?" : CHANNEL_LABEL[info.channel]}
                      </Badge>
                    ) : null}

                    {SAME_SPECIES_ONLY.has(pal.id) ? (
                      <Badge variant="outline" className="text-[10px]">
                        self only
                      </Badge>
                    ) : null}
                  </button>
                </li>
              );
            })}
            {rows.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing matches those filters.
              </li>
            ) : null}
          </ul>
        </div>

        <div
          className="flex w-5 shrink-0 flex-col justify-between py-1"
          aria-label="Jump to letter"
        >
          {LETTERS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => jumpTo(l)}
              className="text-[9px] leading-none text-muted-foreground hover:text-primary"
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {rows.length} of {PALS.length} Pals shown.
      </p>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-2 py-1 text-[11px] transition-colors",
        on
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border/70 text-muted-foreground hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  );
}
