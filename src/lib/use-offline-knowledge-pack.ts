import { useEffect, useState } from "react";

import type { EvidenceRecord } from "@/data/palworld/knowledge";

import { loadOfflineKnowledgePack } from "./offline-knowledge-pack";

export function useOfflineKnowledgePack<T>(name: string) {
  const [records, setRecords] = useState<readonly EvidenceRecord<T>[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    loadOfflineKnowledgePack<T>(name).then(
      (payload) => {
        if (!active) return;
        setRecords(payload);
        setLoading(false);
      },
      (reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error ? reason : new Error(`Knowledge pack ${name} failed to load.`),
        );
        setLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [name]);

  return { records, error, loading };
}
