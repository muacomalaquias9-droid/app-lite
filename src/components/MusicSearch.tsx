import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ChevronLeft, X, Search, Loader2, Play, Pause, Music2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { buildMusicUrl } from "@/lib/musicMeta";
import { pauseAllAudio } from "@/components/MusicPlayer";

interface Music {
  id: string;
  name: string;
  artist: string;
  cover: string;
  duration: string;
  preview?: string;
}

interface MusicSearchProps {
  onSelect: (music: Music) => void;
  onClose?: () => void;
}

const CLIP_LENGTH = 15;

const searchDeezerMusic = async (query: string): Promise<Music[]> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-search?query=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    return (data.tracks || []) as Music[];
  } catch (error) {
    console.error("Error searching music API:", error);
    return [];
  }
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Fixed pseudo-waveform heights so the clip picker looks like Instagram's.
const WAVE = Array.from({ length: 60 }, (_, i) => 30 + Math.round(Math.abs(Math.sin(i * 1.7) * 50 + Math.cos(i * 0.6) * 20)));

export default function MusicSearch({ onSelect, onClose }: MusicSearchProps) {
  const [search, setSearch] = useState("");
  const [music, setMusic] = useState<Music[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"foryou" | "trending">("foryou");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Music | null>(null);
  const [start, setStart] = useState(0);
  const [clipDuration, setClipDuration] = useState(30);
  const [clipPlaying, setClipPlaying] = useState(false);
  const [clipTime, setClipTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    pauseAllAudio();
    loadTrendingMusic();
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const stopAudio = () => {
    audioRef.current?.pause();
    setPreviewId(null);
    setClipPlaying(false);
  };

  const loadTrendingMusic = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trending_music")
        .select("*")
        .eq("is_trending", true)
        .order("play_count", { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        setMusic(data.map((item: any) => ({
          id: item.id,
          name: item.name,
          artist: item.artist,
          cover: item.cover_url || "",
          duration: formatDuration(item.duration || 0),
          preview: item.audio_url,
        })));
        return;
      }

      const lists = await Promise.all(["pop hits 2024", "viral songs"].map(searchDeezerMusic));
      const combined = lists.flatMap((l) => l.slice(0, 25)).filter((m) => m.preview);
      setMusic(combined.sort(() => Math.random() - 0.5).slice(0, 60));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar músicas");
      setMusic([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    debounceRef.current = setTimeout(async () => {
      if (trimmed.length < 2) return loadTrendingMusic();
      setLoading(true);
      const results = await searchDeezerMusic(trimmed);
      setMusic(results.filter((m) => m.preview));
      setLoading(false);
    }, 350);
  };

  const togglePreview = (track: Music, e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !track.preview) return;
    if (previewId === track.id) return stopAudio();
    audio.onended = () => setPreviewId(null);
    audio.ontimeupdate = null;
    audio.src = track.preview;
    audio.currentTime = 0;
    audio.play().then(() => setPreviewId(track.id)).catch(() => toast.error("Não foi possível tocar"));
  };

  const openClipPicker = (track: Music) => {
    if (!track.preview) return;
    stopAudio();
    setPicked(track);
    setStart(0);
    setClipTime(0);
    const audio = audioRef.current!;
    audio.src = track.preview;
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setClipDuration(audio.duration);
    };
    playClip(0);
  };

  const playClip = (from: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = from;
    audio.ontimeupdate = () => {
      const t = audio.currentTime;
      setClipTime(t);
      if (t >= from + CLIP_LENGTH) audio.currentTime = from;
    };
    audio.onended = () => { audio.currentTime = from; audio.play().catch(() => {}); };
    audio.play().then(() => setClipPlaying(true)).catch(() => setClipPlaying(false));
  };

  const maxStart = Math.max(0, clipDuration - CLIP_LENGTH);

  const confirmClip = () => {
    if (!picked?.preview) return;
    stopAudio();
    onSelect({ ...picked, preview: buildMusicUrl(picked.preview, start, picked.cover) });
  };

  // ---------- Clip picker (Instagram style) ----------
  if (picked) {
    const windowPct = Math.min(100, (CLIP_LENGTH / clipDuration) * 100);
    const leftPct = maxStart > 0 ? (start / clipDuration) * 100 : 0;
    const progress = Math.min(1, Math.max(0, (clipTime - start) / CLIP_LENGTH));
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="absolute inset-0 overflow-hidden">
          {picked.cover && <img src={picked.cover} alt="" className="h-full w-full scale-125 object-cover opacity-40 blur-3xl" />}
          <div className="absolute inset-0 bg-background/60" />
        </div>
        <div className="relative flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={() => { stopAudio(); setPicked(null); }} className="h-10 w-10 rounded-full flex items-center justify-center bg-secondary/60 backdrop-blur-xl" aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={confirmClip} className="h-10 px-5 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-1.5">
            <Check className="h-4 w-4" /> Concluído
          </button>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <button
            type="button"
            onClick={() => (clipPlaying ? stopAudio() : playClip(start))}
            className="relative h-48 w-48 overflow-hidden rounded-3xl shadow-2xl"
            aria-label={clipPlaying ? "Pausar" : "Ouvir"}
          >
            {picked.cover ? <img src={picked.cover} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-secondary"><Music2 className="h-12 w-12" /></div>}
            <span className="absolute inset-0 flex items-center justify-center bg-background/20">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-background/70 backdrop-blur-xl">
                {clipPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
              </span>
            </span>
          </button>
          <div className="text-center">
            <p className="text-xl font-bold">{picked.name}</p>
            <p className="text-sm text-muted-foreground">{picked.artist}</p>
          </div>
        </div>

        <div className="relative px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <p className="mb-3 text-center text-sm font-semibold">
            {formatDuration(start)} – {formatDuration(Math.min(clipDuration, start + CLIP_LENGTH))}
          </p>
          <div className="relative h-16 rounded-2xl bg-secondary/50 backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 flex items-center gap-[2px] px-2">
              {WAVE.map((h, i) => {
                const pos = ((i + 0.5) / WAVE.length) * 100;
                const inside = pos >= leftPct && pos <= leftPct + windowPct;
                const played = inside && pos <= leftPct + windowPct * progress;
                return <span key={i} className={`flex-1 rounded-full ${played ? "bg-primary" : inside ? "bg-foreground" : "bg-muted-foreground/40"}`} style={{ height: `${h}%` }} />;
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-1 rounded-xl border-[3px] border-foreground" style={{ left: `${leftPct}%`, width: `${windowPct}%` }} />
            <input
              type="range"
              min={0}
              max={Math.max(0, Math.floor(maxStart))}
              step={1}
              value={start}
              onChange={(e) => { const v = Number(e.target.value); setStart(v); setClipTime(v); }}
              onPointerUp={() => playClip(start)}
              onTouchEnd={() => playClip(start)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Escolher trecho"
              data-no-swipe
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Arrasta para escolher o trecho da música</p>
        </div>
      </div>
    );
  }

  // ---------- Search list ----------
  const list = tab === "trending" ? [...music].reverse() : music;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { stopAudio(); onClose?.(); }} className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center" aria-label="Fechar">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar música"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 rounded-xl border-0 bg-secondary pl-9 pr-9 text-base"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(""); loadTrendingMusic(); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted-foreground/30 flex items-center justify-center" aria-label="Limpar">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {!search && (
          <div className="mt-3 flex gap-6 border-b border-border/50">
            {(["foryou", "trending"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`pb-2.5 text-sm font-semibold transition-colors ${tab === t ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"}`}>
                {t === "foryou" ? "Para ti" : "Em alta"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Music2 className="h-10 w-10" /><p className="text-sm">Nenhuma música encontrada</p>
          </div>
        ) : (
          <div className="py-1">
            {list.map((track) => {
              const playing = previewId === track.id;
              return (
                <div key={track.id} onClick={() => openClipPicker(track)} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 active:bg-secondary/60">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {track.cover ? <img src={track.cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Music2 className="h-5 w-5 text-muted-foreground" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[15px] font-semibold ${playing ? "text-primary" : ""}`}>{track.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{track.artist} · {track.duration}</p>
                  </div>
                  <button type="button" onClick={(e) => togglePreview(track, e)} aria-label={playing ? "Pausar" : "Ouvir música"}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border">
                    {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
