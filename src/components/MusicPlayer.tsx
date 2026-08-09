import { useState, useRef, useEffect, useId, useMemo } from 'react';
import { Music2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Global audio manager: one audio element for the whole app.
let currentPlayingAudio: HTMLAudioElement | null = null;
let currentPlayingId: string | null = null;
let currentTrack: GlobalMusicTrack | null = null;
let currentResolvedUrl = '';
let currentErrorId: string | null = null;
let audioUnlocked = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const fallbackAttempts = new Map<string, number>();
const musicListeners = new Set<() => void>();

// Register a one-time global user-gesture listener at module load so we can
// unlock autoplay for the singleton <audio> element on the first tap/click
// anywhere in the app. This mirrors Instagram's behaviour: the first
// interaction unlocks audio for the rest of the session.
if (typeof window !== 'undefined') {
  const unlock = () => {
    audioUnlocked = true;
    if (currentPlayingAudio && currentPlayingAudio.paused && currentPlayingId) {
      currentPlayingAudio.muted = false;
      currentPlayingAudio.play().catch(() => {});
    } else if (currentPlayingAudio) {
      currentPlayingAudio.muted = false;
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true, once: false });
  window.addEventListener('touchstart', unlock, { passive: true, once: false });
  window.addEventListener('keydown', unlock, { once: false });
}

export interface GlobalMusicTrack {
  id: string;
  musicName: string;
  musicArtist?: string | null;
  musicUrl?: string | null;
}

interface MusicPlayerProps {
  musicName: string;
  musicArtist?: string | null;
  musicUrl?: string | null;
  coverUrl?: string | null;
  overlay?: boolean;
  /** Instagram-style: auto-play when card scrolls into view, pause when out. */
  autoPlayInView?: boolean;
}

const notifyMusicListeners = () => musicListeners.forEach((listener) => listener());

export function subscribeToGlobalMusic(listener: () => void) {
  musicListeners.add(listener);
  return () => {
    musicListeners.delete(listener);
  };
}

export function isGlobalTrackPlaying(trackId: string) {
  return currentPlayingId === trackId && !!currentPlayingAudio && !currentPlayingAudio.paused;
}

export function isGlobalTrackErrored(trackId: string) {
  return currentErrorId === trackId;
}

async function resolveFreshMusicUrl(track: GlobalMusicTrack) {
  const query = `${track.musicArtist || ''} ${track.musicName}`.trim();
  if (!query) return null;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-search?query=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const freshTrack = data.tracks?.find((item: { preview?: string }) => item.preview) || data.tracks?.[0];
    return freshTrack?.preview || null;
  } catch {
    return null;
  }
}

function ensureGlobalAudio() {
  if (!currentPlayingAudio) {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0.86;

    audio.addEventListener('play', notifyMusicListeners);
    audio.addEventListener('pause', notifyMusicListeners);
    audio.addEventListener('canplaythrough', notifyMusicListeners);
    audio.addEventListener('waiting', notifyMusicListeners);
    audio.addEventListener('ended', notifyMusicListeners);
    audio.addEventListener('error', () => {
      const track = currentTrack;
      if (!track) return;

      const attempts = fallbackAttempts.get(track.id) || 0;
      if (attempts >= 2) {
        currentErrorId = track.id;
        notifyMusicListeners();
        return;
      }

      fallbackAttempts.set(track.id, attempts + 1);
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(async () => {
        const freshUrl = await resolveFreshMusicUrl(track);
        if (!freshUrl || !currentPlayingAudio || currentTrack?.id !== track.id) {
          currentErrorId = track.id;
          notifyMusicListeners();
          return;
        }

        currentErrorId = null;
        currentResolvedUrl = freshUrl;
        currentPlayingAudio.src = freshUrl;
        currentPlayingAudio.load();
        currentPlayingAudio.play().catch(() => {
          currentErrorId = track.id;
          notifyMusicListeners();
        });
      }, 700);
    });

    currentPlayingAudio = audio;
  }

  return currentPlayingAudio;
}

export async function playGlobalMusic(track: GlobalMusicTrack) {
  const audio = ensureGlobalAudio();
  const sameTrack = currentPlayingId === track.id;

  currentTrack = track;
  currentPlayingId = track.id;
  currentErrorId = null;
  notifyMusicListeners();

  let playableUrl = sameTrack && currentResolvedUrl ? currentResolvedUrl : track.musicUrl || '';
  if (!playableUrl) playableUrl = await resolveFreshMusicUrl(track) || '';

  if (!playableUrl) {
    currentErrorId = track.id;
    notifyMusicListeners();
    return false;
  }

  if (!sameTrack || currentResolvedUrl !== playableUrl || audio.src !== playableUrl) {
    audio.pause();
    currentResolvedUrl = playableUrl;
    audio.src = playableUrl;
    audio.currentTime = 0;
    audio.load();
  }

  try {
    audio.muted = false;
    await audio.play();
    notifyMusicListeners();
    return true;
  } catch {
    try {
      audio.muted = true;
      await audio.play();
      notifyMusicListeners();
      return true;
    } catch {
      currentErrorId = track.id;
      notifyMusicListeners();
      return false;
    }
  }
}

export async function toggleGlobalMusic(track: GlobalMusicTrack) {
  if (isGlobalTrackPlaying(track.id)) {
    currentPlayingAudio?.pause();
    notifyMusicListeners();
    return false;
  }

  return playGlobalMusic(track);
}

export function MusicPlayer({ musicName, musicArtist, musicUrl, overlay = false, autoPlayInView = false }: MusicPlayerProps) {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const track = useMemo<GlobalMusicTrack>(() => ({
    id: `feed-${instanceId}-${musicName}-${musicArtist || ''}`,
    musicName,
    musicArtist,
    musicUrl,
  }), [instanceId, musicName, musicArtist, musicUrl]);
  const [isPlaying, setIsPlaying] = useState(() => isGlobalTrackPlaying(track.id));
  const [hasError, setHasError] = useState(() => isGlobalTrackErrored(track.id));

  useEffect(() => {
    const syncState = () => {
      setIsPlaying(isGlobalTrackPlaying(track.id));
      setHasError(isGlobalTrackErrored(track.id));
    };
    syncState();
    return subscribeToGlobalMusic(syncState);
  }, [track.id]);

  // Instagram-style auto-play when in viewport
  useEffect(() => {
    if (!autoPlayInView) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          playGlobalMusic(track).then((played) => setHasError(!played));
        } else if (isGlobalTrackPlaying(track.id)) {
          // Instagram behaviour: leaving the content stops its music
          currentPlayingAudio?.pause();
          notifyMusicListeners();
        }
      },
      { threshold: [0, 0.6, 1], rootMargin: '0px 0px -15% 0px' }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (isGlobalTrackPlaying(track.id)) {
        currentPlayingAudio?.pause();
        notifyMusicListeners();
      }
    };
  }, [autoPlayInView, track]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleGlobalMusic(track).then((played) => setHasError(!played && !isPlaying));
  };

  const label = musicArtist ? `${musicName} • ${musicArtist}` : musicName;
  const marquee = isPlaying && label.length > 24;

  if (overlay) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        ref={containerRef}
        className="flex max-w-[240px] items-center gap-2 rounded-full bg-black/80 px-3 py-2 cursor-pointer"
        onClick={togglePlay}
      >
        <Music2 className="h-3.5 w-3.5 text-white shrink-0" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <motion.p
            className="whitespace-nowrap text-white text-xs font-semibold"
            animate={marquee ? { x: ['0%', '-35%', '0%'] } : { x: 0 }}
            transition={marquee ? { duration: 8, repeat: Infinity, ease: 'linear' } : undefined}
          >
            {hasError ? 'Música indisponível' : label}
          </motion.p>
        </div>
            {isPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-0.5"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 h-3 bg-white rounded-full"
                    animate={{ scaleY: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      ref={containerRef}
      className="flex h-8 max-w-full items-center gap-2 cursor-pointer overflow-hidden text-muted-foreground"
      onClick={togglePlay}
    >
      <Music2 className={`h-4 w-4 shrink-0 ${isPlaying ? 'text-primary' : 'text-muted-foreground'}`} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <motion.p
          className="whitespace-nowrap text-[13px] font-semibold leading-none"
          animate={marquee ? { x: ['0%', '-30%', '0%'] } : { x: 0 }}
          transition={marquee ? { duration: 9, repeat: Infinity, ease: 'linear' } : undefined}
        >
          {hasError ? 'Música indisponível' : label}
        </motion.p>
      </div>
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-0.5"
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-4 bg-primary rounded-full"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </motion.div>
          )}
    </motion.div>
  );
}

// Export function to pause all audio globally
export function pauseAllAudio() {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    notifyMusicListeners();
  }
}
