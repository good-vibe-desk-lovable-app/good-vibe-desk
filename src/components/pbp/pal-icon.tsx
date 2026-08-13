import { useState } from "react";

import { palIconPath } from "@/data/palworld/palIcons";
import { cn } from "@/lib/utils";

interface PalIconProps {
  /** The game's internal identifier, e.g. "Umihebi_Fire". */
  internalName: string;
  /** Display name, used as the alt text. */
  name: string;
  /** Rendered size in pixels, square. */
  size?: number;
  className?: string;
}

/**
 * A Pal's icon, or a neutral placeholder when we have none.
 *
 * width/height are always set even though the files are tiny: the browser
 * cannot reserve space for a lazily-loaded image until it arrives, so without
 * them a long virtualised list visibly jumps as rows scroll into view. That is
 * a layout problem, not a bandwidth one, so file size does not excuse it.
 *
 * A missing or broken icon degrades to the same placeholder rather than the
 * browser's broken-image glyph — one Pal has no artwork upstream, and the
 * roster may grow before the fetch workflow is re-run.
 */
export function PalIcon({ internalName, name, size = 32, className }: PalIconProps) {
  const src = palIconPath(internalName);
  const [failed, setFailed] = useState(false);

  const box = cn("shrink-0 rounded-md bg-muted/40 object-contain", className);

  if (!src || failed) {
    return (
      <span
        role="presentation"
        aria-hidden="true"
        className={cn(box, "inline-block")}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={box}
      style={{ width: size, height: size }}
    />
  );
}
