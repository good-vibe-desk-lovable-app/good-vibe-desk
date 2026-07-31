import { useState } from "react";
import { BookOpen, ChevronsUpDown } from "lucide-react";

import { SAME_SPECIES_ONLY } from "@/data/palworld";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HowBreedingWorks() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-8">
      <Card className="border-border/70 bg-card/60">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4" /> How breeding works
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Put a male and a female Pal in the Breeding Farm and drop a cake in the feed box. They
              produce an egg; you incubate it, and out comes the child.
            </p>
            <p>
              Every pair produces <em>something</em>. Each species has a hidden breeding power, and
              the child is whichever species sits closest to the average of the two parents' values.
              That's why two unrelated Pals still give you a definite, predictable result.
            </p>
            <p>
              A set of special pairs overrides that average to produce variants — Relaxaurus +
              Sparkit gives Relaxaurus Lux, for example, no matter what the averages say.
            </p>
            <p>
              {SAME_SPECIES_ONLY.size} Pals break both rules: they only breed true with themselves.
              You have to catch one of each gender before you can breed more.
            </p>
            <p>
              Passives come from the parents' combined pool and a Pal can hold at most four. Special
              Cake improves the odds of passing the ones you want.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
