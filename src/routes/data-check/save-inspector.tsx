import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SaveFileInspector } from "@/components/save-file-inspector";
import { Button } from "@/components/ui/button";

const TITLE = "Save File Inspector — Palworld Diagnostic Tool";
const DESCRIPTION =
  "Inspect Palworld GVAS save headers (e.g. Level.sav) for magic bytes, compression, format version, and parameter map structure.";

export const Route = createFileRoute("/data-check/save-inspector")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: SaveInspectorPage,
});

function SaveInspectorPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="min-h-[44px] -ml-2 px-3">
            <Link to="/data-check">
              <ArrowLeft className="size-4 mr-1" />
              Back to data check
            </Link>
          </Button>
        </div>

        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Save File Inspector</h1>
          <p className="text-sm text-muted-foreground">
            Diagnostic tool for inspecting local Palworld .sav file headers.
          </p>
        </header>

        <SaveFileInspector />
      </div>
    </div>
  );
}
