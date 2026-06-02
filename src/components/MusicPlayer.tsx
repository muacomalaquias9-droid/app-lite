import { useState, useRef, useEffect, useId } from 'react';
import { Disc3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Global audio manager - only one audio plays at a time
let currentPlayingAudio: HTMLAudioElement | null = null;
let currentPlayingId: string | null = null;

interface MusicPlayerProps {
  musicName: string;
  musicArtist?: string | null;
  musicUrl?: string | null;
  coverUrl?: string | null;
  overlay?: boolean;
  /** Instagram-style: auto-play when card scrolls into view, pause when out. */
  autoPlayInView?: boolean;
}

// Generate album art color based on music name
function generateCoverGradient(name: string): string {
  const colors = [
    'from-pink-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-500',
    'from-teal-500 to-green-500',
  ];
  const index = name.length % colors.length;
  return colors[index];
}

export function MusicPlayer({ musicName, musicArtist, musicUrl, coverUrl, overlay = false, autoPlayInView = false }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const instanceId = useId();

  const gradientClass = generateCoverGradient(musicName);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setIsLoaded(true);
      setHasError(false);
    };
    const handleCanPlay = () => {
      setIsLoaded(true);
      setHasError(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      if (currentPlayingId === instanceId) {
        currentPlayingAudio = null;
        currentPlayingId = null;
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      console.log('Music load error for:', musicUrl);
      retryCountRef.current++;
      if (retryCountRef.current <= 2 && audio) {
        setTimeout(() => { audio.load(); }, 1500);
      } else {
        setHasError(true);
        setIsLoaded(false);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    // Preload the audio
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [instanceId, musicUrl]);

  // Instagram-style auto-play when in viewport
  useEffect(() => {
    if (!autoPlayInView) return;
    const audio = audioRef.current;
    const node = containerRef.current;
    if (!audio || !node || !musicUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          // Pause any other playing audio
          if (currentPlayingAudio && currentPlayingId !== instanceId) {
            currentPlayingAudio.pause();
          }
          currentPlayingAudio = audio;
          currentPlayingId = instanceId;
          // Start muted to bypass autoplay restrictions, then unmute
          audio.muted = false;
          audio.play().catch(() => {
            audio.muted = true;
            audio.play().catch(() => {});
          });
        } else {
          if (!audio.paused) audio.pause();
          if (currentPlayingId === instanceId) {
            currentPlayingAudio = null;
            currentPlayingId = null;
          }
        }
      },
      { threshold: [0, 0.6, 1], rootMargin: '0px 0px -15% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [autoPlayInView, musicUrl, instanceId]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !musicUrl || hasError) return;

    if (isPlaying) {
      audio.pause();
      if (currentPlayingId === instanceId) {
        currentPlayingAudio = null;
        currentPlayingId = null;
      }
    } else {
      // Pause any other playing audio
      if (currentPlayingAudio && currentPlayingId !== instanceId) {
        currentPlayingAudio.pause();
      }
      
      // Set this as the current playing audio
      currentPlayingAudio = audio;
      currentPlayingId = instanceId;
      
      audio.play().catch(() => {
        // Retry on error
        setTimeout(() => {
          audio.play().catch(console.log);
        }, 100);
      });
    }
  };

  // Album Art Component (no visible controls — Instagram/Threads style)
  const AlbumArt = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'h-9 w-9',
      md: 'h-12 w-12',
      lg: 'h-16 w-16'
    };

    return (
      <motion.div
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isPlaying ? { duration: 3, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden relative`}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={musicName} className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-white/30" />
            </div>
            <Disc3 className={`${size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'} text-white/80`} />
          </>
        )}
        {/* Vinyl record effect */}
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-[20%] rounded-full border border-white/20" />
      </motion.div>
    );
  };

  if (overlay) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-3 py-2 max-w-fit cursor-pointer"
        onClick={togglePlay}
      >
        {musicUrl && (
          <audio 
            ref={audioRef} 
            src={musicUrl} 
            preload="auto"
            crossOrigin="anonymous"
          />
        )}
        
        <AlbumArt size="sm" />
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-semibold truncate max-w-[150px]">
                {musicName}
              </p>
              {musicArtist && (
                <p className="text-white/70 text-[10px] truncate max-w-[150px]">
                  {musicArtist}
                </p>
              )}
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
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      ref={containerRef}
      className="flex items-center gap-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl p-3 cursor-pointer border border-pink-500/20 hover:border-pink-500/40 transition-colors"
      onClick={togglePlay}
    >
      {musicUrl && (
        <audio 
          ref={audioRef} 
          src={musicUrl} 
          preload="auto"
          crossOrigin="anonymous"
        />
      )}
      
      <AlbumArt size="md" />
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{musicName}</p>
            {musicArtist && (
              <p className="text-muted-foreground text-xs truncate">{musicArtist}</p>
            )}
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
        </div>
        {hasError && (
          <p className="text-xs text-red-500 mt-1">Erro ao carregar áudio</p>
        )}
      </div>
    </motion.div>
  );
}

// Export function to pause all audio globally
export function pauseAllAudio() {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio = null;
    currentPlayingId = null;
  }
}
