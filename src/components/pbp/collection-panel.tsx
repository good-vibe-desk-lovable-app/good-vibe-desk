import { useRef, useState } from "react";
import { Download, Mars, Pencil, Plus, Trash2, Upload, Venus, HelpCircle, Layers } from "lucide-react";
import { toast } from "sonner";

import { DATA_VERSION, palById } from "@/data/palworld";
import {
  getPassive,
  parseCollectionFileDetailed,
  type CollectionEntry,
  type Gender,
} from "@/lib/collection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPalDialog } from "./add-pal-dialog";
import { BulkAddDialog } from "./bulk-add-dialog";
import { PalIcon } from "./pal-icon";

/** Exports are a few KB even for huge collections — anything near this is not ours. */
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

function GenderIcon({ gender }: { gender: Gender }) {
  const label = gender === "male" ? "Male" : gender === "female" ? "Female" : "Gender unknown";
  const Icon = gender === "male" ? Mars : gender === "female" ? Venus : HelpCircle;
  return <Icon className="size-4 text-muted-foreground" aria-label={label} />;
}

interface CollectionPanelProps {
  entries: CollectionEntry[];
  onChange: (entries: CollectionEntry[]) => void;
}

export function CollectionPanel({ entries, onChange }: CollectionPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionEntry | null>(null);
  const [pendingImport, setPendingImport] = useState<CollectionEntry[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSave(entry: CollectionEntry) {
    const exists = entries.some((e) => e.instanceId === entry.instanceId);
    onChange(exists ? entries.map((e) => (e.instanceId === entry.instanceId ? entry : e)) : [...entries, entry]);
  }

  /** Bulk entry appends many at once; ids are freshly generated so no clashes. */
  function handleAddMany(newEntries: CollectionEntry[]) {
    onChange([...entries, ...newEntries]);
  }

  function handleExport() {
    const isoDate = new Date().toISOString().slice(0, 10);
    const payload = { version: 1, dataVersion: DATA_VERSION.dataVersion, entries };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pbp-collection-${isoDate}.json`;
    // Firefox (notably mobile) will not honour a click on a detached anchor,
    // and revoking the URL synchronously can race the download start. Attach,
    // click, detach, and revoke on the next macrotask.
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function handleImportFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError("That file is too large to be a collection export.");
      return;
    }
    try {
      const parsed = parseCollectionFileDetailed(JSON.parse(await file.text()));
      if (!parsed) {
        setImportError("That file isn't a valid collection export.");
        return;
      }
      setImportError(null);
      for (const note of parsed.notes) toast(note);
      setPendingImport(parsed.entries);
    } catch {
      setImportError("That file isn't a valid collection export.");
    }
  }

  const [importError, setImportError] = useState<string | null>(null);

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Your Collection</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={entries.length === 0}>
              <Download className="size-4" /> Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="flex-1"
          >
            <Plus className="size-4" /> Add Pal
          </Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="flex-1">
            <Layers className="size-4" /> Add several
          </Button>
        </div>
        {importError ? <p className="text-xs text-destructive">{importError}</p> : null}
      </CardHeader>

      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing here yet. Add the Pals you already own — passives can only come from Pals in
            your collection.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => {
              const pal = palById.get(entry.palId);
              return (
                <li
                  key={entry.instanceId}
                  className="rounded-xl border border-border/70 bg-background/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {pal ? (
                          <PalIcon internalName={pal.internalName} name={pal.name} size={36} />
                        ) : null}
                        <GenderIcon gender={entry.gender} />
                        <span className="truncate font-semibold">{pal?.name ?? "Unknown Pal"}</span>
                        {pal ? (
                          <span className="text-xs text-muted-foreground">#{pal.palDexNo}</span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.passiveIds.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No passives recorded</span>
                        ) : (
                          entry.passiveIds.map((id) => (
                            <Badge key={id} variant="secondary" className="text-[11px]">
                              {getPassive(id)?.name ?? id}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${pal?.name ?? "Pal"}`}
                        onClick={() => {
                          setEditing(entry);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${pal?.name ?? "Pal"}`}
                        onClick={() =>
                          onChange(entries.filter((e) => e.instanceId !== entry.instanceId))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <AddPalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={handleSave}
      />

      <BulkAddDialog open={bulkOpen} onOpenChange={setBulkOpen} onAddMany={handleAddMany} />

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Importing will replace all {entries.length} current{" "}
              {entries.length === 1 ? "entry" : "entries"} with the {pendingImport?.length ?? 0} from
              this file. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImport) onChange(pendingImport);
                setPendingImport(null);
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
