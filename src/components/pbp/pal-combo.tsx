import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PALS, palById } from "@/data/palworld";
import { normaliseQuery, searchPals } from "@/lib/search-rank";
import { cn } from "@/lib/utils";

import { PalIcon } from "./pal-icon";

/**
 * The single Pal picker.
 *
 * This pattern — Popover + Command + a ranked Pal list + PalIcon — was written
 * three separate times across the app before it lived here. Rank ordering was
 * already consolidated into @/lib/search-rank for exactly the same reason, and
 * then the surrounding component was duplicated anyway. One copy, imported.
 *
 * shouldFilter={false} matters: cmdk's built-in filter scores whatever list it
 * is handed, which would re-sort ranked results back into its own order. The
 * list arrives pre-ranked by searchPals, so "van" surfaces Vanwyrm rather than
 * burying it under every name containing those letters.
 */
export interface PalComboProps {
  value: number | null;
  onChange: (id: number) => void;
  /** Button text when nothing is selected. Also the accessible name. */
  label?: string;
  /** Show the selected Pal's artwork on the trigger button. */
  showIcon?: boolean;
  className?: string;
  disabled?: boolean;
}

export function PalCombo({
  value,
  onChange,
  label = "Pick a Pal",
  showIcon = true,
  className,
  disabled = false,
}: PalComboProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const pal = value === null ? null : palById.get(value);
  const results = useMemo(() => searchPals(PALS, normaliseQuery(query)), [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {showIcon && pal ? (
              <PalIcon internalName={pal.internalName} name={pal.name} size={22} />
            ) : null}
            <span className="truncate">{pal?.name ?? label}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,92vw)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search Pals…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No Pal found.</CommandEmpty>
            {results.map((p) => (
              <CommandItem
                key={p.id}
                value={String(p.id)}
                onSelect={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
              >
                <Check className={cn("size-4", p.id === value ? "opacity-100" : "opacity-0")} />
                <PalIcon internalName={p.internalName} name={p.name} size={22} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">#{p.palDexNo}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
