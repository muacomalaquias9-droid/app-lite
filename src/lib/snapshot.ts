// Tiny last-seen snapshot so screens paint instantly, then refresh from the network.
const PREFIX = 'paji-snap:';

export function readSnapshot<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeSnapshot(key: string, value: unknown, maxItems = 40) {
  try {
    const v = Array.isArray(value) ? value.slice(-maxItems) : value;
    localStorage.setItem(PREFIX + key, JSON.stringify(v));
  } catch {
    // storage full: drop old snapshots and move on
    try {
      Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

export function clearSnapshots() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
  } catch {}
}
