import { useCallback, useEffect, useState } from "react";

import type { EvidenceRecord } from "@/data/palworld/knowledge";
import type { ItemKnowledge } from "@/data/palworld/knowledgeItems";

import {
  downloadOptionalItemPack,
  fetchOptionalItemPackManifest,
  hasOptionalItemPack,
  loadDownloadedOptionalItemPack,
  removeOptionalItemPack,
  type OptionalItemPackManifest,
} from "./optional-items-pack";

type ItemPackState = "checking" | "available" | "downloading" | "installed" | "error";

export function useOptionalItemsPack() {
  const [manifest, setManifest] = useState<OptionalItemPackManifest | null>(null);
  const [state, setState] = useState<ItemPackState>("checking");
  const [records, setRecords] = useState<readonly EvidenceRecord<ItemKnowledge>[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const inspect = useCallback(async () => {
    setState("checking");
    setError(null);
    try {
      const installed = await hasOptionalItemPack();
      const nextManifest = await fetchOptionalItemPackManifest({
        allowInstalledCache: installed,
      });
      setManifest(nextManifest);
      if (installed) {
        setRecords(await loadDownloadedOptionalItemPack());
        setState("installed");
      } else {
        setRecords([]);
        setState("available");
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason : new Error("Item pack status could not be read."));
      setState("error");
    }
  }, []);

  useEffect(() => {
    void inspect();
  }, [inspect]);

  const download = useCallback(async () => {
    setState("downloading");
    setError(null);
    try {
      setRecords(await downloadOptionalItemPack());
      setState("installed");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason : new Error("Item pack download failed."));
      setState("error");
    }
  }, []);

  const remove = useCallback(async () => {
    setError(null);
    try {
      await removeOptionalItemPack();
      setRecords([]);
      setState("available");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason : new Error("Item pack could not be removed."));
      setState("error");
    }
  }, []);

  return {
    download,
    error,
    manifest,
    records,
    remove,
    state,
  };
}
