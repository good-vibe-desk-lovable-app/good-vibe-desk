import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Network } from "lucide-react";

import { BreedingExplorer } from "@/components/pbp/breeding-explorer";
import { Button } from "@/components/ui/button";

const TITLE = "Breeding Explorer — Every Pal a Species Can Produce";
const DESCRIPTION =
  "Pick any Pal and see every partner it can breed with, grouped by the offspring they produce, then walk down the line one generation at a time.";
const SITE = "https://good-vibe-desk.kevinjackson1114.workers.dev/explore";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE }],
  }),
  component: ExplorePage,
});

/**
 * The explorer lives on its own route rather than inside the pathfinder page.
 *
 * routes/index.tsx already stacks the collection, target picker, passive
 * selection, "every way to breed X", recommended targets, results, the merge
 * tree, breeding lookup and the explainer. Adding a tenth full-width section
 * would push the primary action further down a page whose thumb-reach problem
 * we only just patched with a sticky bar. A separate route costs one tap and
 * keeps both pages answering one question each.
 *
 * This page is also a different JOB from the pathfinder: the pathfinder asks
 * "how do I get X from what I own", the explorer asks "what can this Pal make,
 * and what can those make" — no collection required.
 */
function ExplorePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative mx-auto max-w-4xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to the pathfinder
          </Link>
        </Button>

        <div className="mb-2 flex items-center gap-2">
          <Network className="size-5 text-primary" />
          <h1 className="text-2xl font-bold">Breeding Explorer</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Pick a Pal to see everything it can produce and who it needs as a partner. Tap an
          offspring to make it the new parent and keep walking down the line. Nothing here needs a
          collection — it is the whole breeding space, not just what you own.
        </p>

        <BreedingExplorer />

        <p className="mt-6 text-xs text-muted-foreground">
          Pairings come from the same datamined breeding table the pathfinder uses. Offspring are
          grouped because breeding power maps many different partners onto the same child — one Pal
          has 300 possible pairings but far fewer distinct results.
        </p>
      </div>
    </div>
  );
}
