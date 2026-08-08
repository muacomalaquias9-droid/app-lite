import { useState, useRef, useEffect, memo } from 'react';
import { useNetworkOptimization } from '@/hooks/useNetworkOptimization';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OptimizedVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

export const OptimizedVideo = memo(({
  src,
  poster,
  className = '',
  autoPlay = false,
  loop = false,
  muted = true,
  controls = false,
  onPlay,
  onPause,
  onError,
  onClick,
}: OptimizedVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const { isSlowNetwork, getPreloadStrategy, isOnline } = useNetworkOptimization();

  // Aggressive preloading for fast startup
  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    
    // Use intersection observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading when visible
            video.preload = 'auto';
            video.load();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, [src]);

  // Track loading progress
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0) {
          setLoadProgress((bufferedEnd / duration) * 100);
        }
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      if (autoPlay) {
        video.play().catch(() => {});
      }
    };

    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
      onError?.();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    video.addEventListener('progress', handleProgress);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [autoPlay, onPlay, onPause, onError]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Erro ao carregar vídeo</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {/* Loading skeleton (sem progress bar) */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10"
          >
            <Skeleton className="w-full h-full" />
          </motion.div>
        )}
      </AnimatePresence>

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline
        preload={getPreloadStrategy()}
        // Performance optimizations
        disablePictureInPicture
        disableRemotePlayback
      />

      {/* Play indicator for paused videos */}
      <AnimatePresence>
        {!isPlaying && !isLoading && !controls && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="h-16 w-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-8 w-8 text-white fill-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

OptimizedVideo.displayName = 'OptimizedVideo';
