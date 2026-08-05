// Recently-used Pals, persisted so the picker can put them one tap away.
const RECENT_KEY = "pbp:recentPals:v1";
const MAX_RECENT = 10;

export function loadRecentPals(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === "number").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentPal(palId: number): number[] {
  const next = [palId, ...loadRecentPals().filter((id) => id !== palId)].slice(0, MAX_RECENT);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* quota or private mode */
  }
  return next;
}
