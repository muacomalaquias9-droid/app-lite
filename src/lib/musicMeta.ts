// Music metadata (clip start + cover) travels inside the saved music URL hash,
// e.g. "https://.../preview.mp3#t=12&c=<encoded cover>". Browsers ignore the hash
// when fetching audio, and "#t=" is a standard media fragment for the start time.
export interface MusicMeta {
  url: string;
  start: number;
  cover: string | null;
}

export function buildMusicUrl(url: string, start = 0, cover?: string | null) {
  const clean = url.split("#")[0];
  const parts: string[] = [];
  parts.push(`t=${Math.max(0, Math.round(start))}`);
  if (cover) parts.push(`c=${encodeURIComponent(cover)}`);
  return `${clean}#${parts.join("&")}`;
}

export function parseMusicUrl(raw?: string | null): MusicMeta {
  if (!raw) return { url: "", start: 0, cover: null };
  const [url, hash = ""] = raw.split("#");
  const params = new URLSearchParams(hash);
  const start = Number(params.get("t") || 0);
  const cover = params.get("c");
  return { url, start: Number.isFinite(start) ? start : 0, cover: cover || null };
}
