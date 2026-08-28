import React, { useState } from "react";
import type { GvasHeaderReport } from "@/lib/importers/gvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SaveFileInspector() {
  const [report, setReport] = useState<GvasHeaderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setReport(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Lazy load GVAS header inspection module
      const { inspectGvasHeader } = await import("@/lib/importers/gvas");
      const result = await inspectGvasHeader(arrayBuffer);
      setReport(result);
    } catch (err) {
      setReport({
        isGvasMagicPresent: false,
        saveFormatVersion: null,
        gvasVersion: null,
        isDecompressed: false,
        compressionType: "unknown",
        hasCharacterSaveParameterMap: false,
        topLevelKeys: [],
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto my-6 border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Palworld .sav File Diagnostic Inspector
          <Badge variant="outline">Phase 1</Badge>
        </CardTitle>
        <CardDescription>
          Select a local Palworld save file (e.g. Level.sav) to inspect GVAS header magic, format
          version, decompression, and CharacterSaveParameterMap presence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              Choose .sav File
              <input type="file" accept=".sav" onChange={handleFileChange} className="hidden" />
            </label>
          </Button>
          <span className="text-sm text-muted-foreground truncate">
            {fileName ? fileName : "No file selected"}
          </span>
        </div>

        {loading && (
          <div className="text-sm text-muted-foreground py-2">
            Inspecting GVAS header and decompressing chunk...
          </div>
        )}

        {report && (
          <div className="space-y-3 pt-2 text-sm border-t">
            {report.error ? (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md font-medium">
                Parsing Error: {report.error}
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-medium">
                GVAS Header Parsed Successfully
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-muted rounded">
                <span className="font-sans font-semibold text-muted-foreground block">
                  GVAS Magic Bytes:
                </span>
                {report.isGvasMagicPresent ? "✅ Present (GVAS)" : "❌ Absent / Invalid"}
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="font-sans font-semibold text-muted-foreground block">
                  Save Format Version:
                </span>
                {report.saveFormatVersion !== null ? report.saveFormatVersion : "N/A"}
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="font-sans font-semibold text-muted-foreground block">
                  Compression Status:
                </span>
                {report.isDecompressed
                  ? `Decompressed (${report.compressionType})`
                  : "Uncompressed"}
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="font-sans font-semibold text-muted-foreground block">
                  CharacterSaveParameterMap:
                </span>
                {report.hasCharacterSaveParameterMap ? "✅ Found" : "❌ Not Found"}
              </div>
            </div>

            {report.topLevelKeys.length > 0 && (
              <div className="space-y-1">
                <span className="font-semibold text-xs text-muted-foreground block">
                  Found Top-Level Keys ({report.topLevelKeys.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {report.topLevelKeys.map((key) => (
                    <Badge
                      key={key}
                      variant={key === "CharacterSaveParameterMap" ? "default" : "secondary"}
                      className="text-[11px] font-mono"
                    >
                      {key}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
