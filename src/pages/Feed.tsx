import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Share2, Bookmark, Play, Volume2, VolumeX, MoreHorizontal, Heart, Send, Menu, RefreshCw, Loader2, Search, Bell, UserPlus } from "lucide-react";
import { MusicPlayer, pauseAllAudio } from "@/components/MusicPlayer";
import NewUsersCascade from "@/components/NewUsersCascade";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge, { hasSpecialBadgeEmoji } from "@/components/VerificationBadge";
import { FeedSkeleton } from "@/components/loading/FeedSkeleton";
import { parseTextWithLinksAndMentions } from "@/utils/textUtils";
import { SponsoredAd } from "@/components/SponsoredAd";
import { ImageGalleryViewer } from "@/components/ImageGalleryViewer";
import { motion, AnimatePresence } from "framer-motion";
import PostOptionsSheet from "@/components/PostOptionsSheet";
import { playLikeSound, playClickSound } from "@/utils/soundEffects";
import { useRateLimiting } from "@/hooks/useRateLimiting";
import BottomNav from "@/components/BottomNav";
import { useContentProtection } from "@/hooks/useContentProtection";
import StickerReactions from "@/components/StickerReactions";

interface Post {
  id: string;
  content: string;
  user_id: string;
  media_urls?: string[];
  music_name?: string | null;
  music_artist?: string | null;
  music_url?: string | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    first_name: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
  post_likes: { user_id: string }[];
  post_reactions: { user_id: string; reaction_type: string }[];
  comments: { id: string }[];
}

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkLikeLimit } = useRateLimiting();
  useContentProtection();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sponsoredAds, setSponsoredAds] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [optionsSheet, setOptionsSheet] = useState<{ open: boolean; post: Post | null }>({ open: false, post: null });
  const [mutedVideos, setMutedVideos] = useState<{ [key: string]: boolean }>({});
  const [likeAnimations, setLikeAnimations] = useState<{ [key: string]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [following, setFollowing] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingMoreRef = useRef(false);
  const postRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const postObserverRef = useRef<IntersectionObserver | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedVideosRef = useRef<Set<HTMLVideoElement>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return;
    const container = scrollContainerRef.current;
    if (container && container.scrollTop > 0) { isPulling.current = false; setPullDistance(0); return; }
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 50 && !refreshing) {
      setRefreshing(true);
      setPullDistance(60);
      await loadPosts();
      setRefreshing(false);
    }
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance, refreshing]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const [profileResult, savedResult, blockedResult, followResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
          supabase.from('blocked_accounts').select('user_id'),
          supabase.from('follows').select('following_id').eq('follower_id', user.id),
        ]);
        if (profileResult.data) setMyProfile(profileResult.data);
        if (savedResult.data) setSavedPosts(savedResult.data.map(s => s.post_id));
        if (blockedResult.data) setBlockedUserIds(blockedResult.data.map(b => b.user_id));
        if (followResult.data) setFollowing(followResult.data.map((f: any) => f.following_id));
      }
      await Promise.all([loadPosts(), loadSponsoredAds()]);
      setLoading(false);
    };
    loadData();

    // Real-time com debounce: evita recarregar o feed a cada like (muito mais leve)
    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => { loadPosts(); }, 1200);
    };

    const channel = supabase.channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, scheduleReload)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, scheduleReload)
      .subscribe();
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    observerRef.current?.disconnect();
    observedVideosRef.current = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            observedVideosRef.current.forEach((v) => { if (v !== video && !v.paused) v.pause(); });
            video.play().catch(() => { video.muted = true; video.play().catch(console.log); });
          } else { if (!video.paused) video.pause(); }
        });
      },
      { threshold: 0.55, rootMargin: '0px 0px -20% 0px' }
    );
    observerRef.current = observer;
    Object.values(videoRefs.current).forEach((video) => {
      if (!video) return;
      observedVideosRef.current.add(video);
      observer.observe(video);
    });
    return () => { observer.disconnect(); };
  }, [posts]);

  // Instagram behaviour: ao chegar num conteúdo sem música, a música anterior para.
  useEffect(() => {
    postObserverRef.current?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.5)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const postId = (visible.target as HTMLElement).dataset.postId;
        const post = posts.find((p) => p.id === postId);
        if (post && !post.music_name) pauseAllAudio();
      },
      { threshold: [0, 0.5, 0.75, 1] }
    );
    postObserverRef.current = observer;
    Object.values(postRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => { observer.disconnect(); };
  }, [posts]);

  const handleFollow = async (targetId: string) => {
    if (!currentUserId || targetId === currentUserId) return;
    playClickSound();
    if (following.includes(targetId)) {
      setFollowing((prev) => prev.filter((id) => id !== targetId));
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetId);
    } else {
      setFollowing((prev) => [...prev, targetId]);
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId });
    }
  };

  /** Reação com sticker/emoji: interage direto no feed (aparece nos comentários). */
  const handleStickerReaction = async (postId: string, value: string) => {
    if (!currentUserId) return;
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, comments: [...(p.comments || []), { id: `tmp-${Date.now()}` }] }
      : p));
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: currentUserId, content: value });
    if (error) { toast.error('Não foi possível reagir'); loadPosts(); return; }
    toast.success(`Reagiste com ${value}`);
  };

  const PAGE_SIZE = 15;

  const POST_SELECT = `*, profiles!inner(id, username, full_name, first_name, avatar_url, verified, badge_type), post_likes(user_id), post_reactions(user_id, reaction_type), comments(id)`;

  /** Carrega a primeira página: todas as publicações públicas de todos os utilizadores. */
  const loadPosts = async () => {
    const { data } = await supabase.from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (data) {
      setPosts(data as any);
      setHasMore(data.length === PAGE_SIZE);
    }
  };

  /** Scroll infinito: o feed fica sempre cheio de publicações. */
  const loadMorePosts = async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const from = posts.length;
    const { data } = await supabase.from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (data) {
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...(data as any[]).filter((p) => !seen.has(p.id))];
      });
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
    loadingMoreRef.current = false;
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 900) loadMorePosts();
  }, [posts.length, hasMore]);

  const loadSponsoredAds = async () => {
    // Check global ads toggle first
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ads_enabled")
      .maybeSingle();
    const adsEnabled = setting?.value === true || setting?.value === "true";
    if (!adsEnabled) {
      setSponsoredAds([]);
      return;
    }
    const { data } = await supabase.from("sponsored_ads").select("*").eq("is_active", true);
    if (data) setSponsoredAds(data);
  };

  // Optimistic like
  const handleLike = async (postId: string) => {
    if (!currentUserId) return;
    const postIdx = posts.findIndex(p => p.id === postId);
    if (postIdx === -1) return;
    const post = posts[postIdx];
    const existingReaction = post.post_reactions?.find(r => r.user_id === currentUserId);
    const existingLike = post.post_likes?.find(l => l.user_id === currentUserId);
    const existing = existingReaction || existingLike;

    // Optimistic update
    const newPosts = [...posts];
    if (existing) {
      newPosts[postIdx] = {
        ...post,
        post_reactions: (post.post_reactions || []).filter(r => r.user_id !== currentUserId),
        post_likes: (post.post_likes || []).filter(l => l.user_id !== currentUserId),
      };
      playClickSound();
    } else {
      // Reações ilimitadas — sem verificação de limite.

      newPosts[postIdx] = {
        ...post,
        post_reactions: [...(post.post_reactions || []), { user_id: currentUserId, reaction_type: "heart" }],
        post_likes: [...(post.post_likes || []), { user_id: currentUserId }],
      };
      playLikeSound();
      setLikeAnimations(prev => ({ ...prev, [postId]: true }));
      setTimeout(() => setLikeAnimations(prev => ({ ...prev, [postId]: false })), 1000);
    }
    setPosts(newPosts);

    // DB operation
    if (existing) {
      await Promise.all([
        supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", currentUserId),
        supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", currentUserId),
      ]);
    } else {
      await Promise.all([
        supabase.from("post_reactions").insert({ post_id: postId, user_id: currentUserId, reaction_type: "heart" }),
        supabase.from("post_likes").insert({ post_id: postId, user_id: currentUserId }),
      ]);
    }
  };

  const handleDoubleTapLike = async (postId: string) => {
    const userReaction = posts.find(p => p.id === postId)?.post_reactions?.find(r => r.user_id === currentUserId);
    if (!userReaction) { await handleLike(postId); }
    else {
      setLikeAnimations(prev => ({ ...prev, [postId]: true }));
      setTimeout(() => setLikeAnimations(prev => ({ ...prev, [postId]: false })), 1000);
    }
  };

  const handleSave = async (postId: string) => {
    if (!currentUserId) return;
    if (savedPosts.includes(postId)) {
      await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', currentUserId);
      setSavedPosts(savedPosts.filter(id => id !== postId));
      toast.success('Removido dos guardados');
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: currentUserId });
      setSavedPosts([...savedPosts, postId]);
      toast.success('Guardado!');
    }
  };

  const getUserReaction = (post: Post) => {
    const reaction = post.post_reactions?.find(r => r.user_id === currentUserId)?.reaction_type;
    if (reaction) return reaction;
    return post.post_likes?.some(like => like.user_id === currentUserId) ? 'heart' : undefined;
  };

  const getLikeCount = (post: Post) => Math.max(post.post_reactions?.length || 0, post.post_likes?.length || 0);

  const isVideo = (url: string) => {
    if (!url) return false;
    const l = url.toLowerCase();
    return l.includes(".mp4") || l.includes(".webm") || l.includes(".mov") || l.includes(".avi") || l.includes(".mkv");
  };

  const toggleVideoMute = (postId: string) => {
    const video = videoRefs.current[postId];
    if (video) { video.muted = !video.muted; setMutedVideos({ ...mutedVideos, [postId]: video.muted }); }
  };

  const registerVideoRef = (key: string) => (el: HTMLVideoElement | null) => {
    const prev = videoRefs.current[key];
    if (prev && observerRef.current) { observerRef.current.unobserve(prev); observedVideosRef.current.delete(prev); }
    if (el) { videoRefs.current[key] = el; observedVideosRef.current.add(el); observerRef.current?.observe(el); }
    else { delete videoRefs.current[key]; }
  };

  const VideoPlayer = ({ url, postId }: { url: string; postId: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const isMuted = mutedVideos[postId] ?? true;

    const handleError = () => {
      if (retryCount < 2) {
        setRetryCount(r => r + 1);
        const video = videoRefs.current[postId];
        if (video) { video.load(); video.play().catch(() => {}); }
      } else {
        setHasError(true);
      }
    };

    if (hasError) {
      return (
        <div className="relative bg-muted/30 overflow-hidden aspect-video flex items-center justify-center rounded-3xl">
          <div className="text-center p-4">
            <Play className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">Não foi possível carregar</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative bg-black overflow-hidden rounded-3xl aspect-[4/5] max-h-[540px]" onClick={() => {
        const video = videoRefs.current[postId];
        if (video) { if (video.paused) { video.play(); } else { video.pause(); } }
      }}>
        <video ref={registerVideoRef(postId)}
          src={url}
          className={`absolute inset-0 h-full w-full object-contain cursor-pointer transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
          playsInline muted={isMuted} loop preload="metadata"
          disablePictureInPicture disableRemotePlayback
          onLoadedData={() => setIsReady(true)}
          onCanPlay={() => setIsReady(true)}
          onPlay={() => { setIsPlaying(true); setIsReady(true); }}
          onPause={() => setIsPlaying(false)}
          onError={handleError} />

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
          </div>
        )}

        {isReady && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-16 w-16 rounded-full bg-background/80 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-border/20">
              <Play className="h-7 w-7 text-foreground fill-foreground ml-1" />
            </div>
          </div>
        )}
        <button className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-background/60 backdrop-blur-xl flex items-center justify-center border border-border/20"
          onClick={(e) => { e.stopPropagation(); toggleVideoMute(postId); }}>
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    );
  };

  const renderMediaGrid = (mediaUrls: string[], postId: string) => {
    if (!mediaUrls || mediaUrls.length === 0) return null;
    if (mediaUrls.length === 1) {
      const url = mediaUrls[0];
      return (
        <div className="relative" onDoubleClick={() => handleDoubleTapLike(postId)}>
          {isVideo(url) ? <VideoPlayer url={url} postId={postId} /> : (
            <img src={url} alt="Post" className="w-full object-cover rounded-3xl cursor-pointer" loading="lazy" onClick={() => setGalleryImages(mediaUrls)} />
          )}
          <AnimatePresence>
            {likeAnimations[postId] && (
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="h-24 w-24 text-white fill-white drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }
    return (
      <div className={`grid gap-1.5 rounded-3xl overflow-hidden ${mediaUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`} onDoubleClick={() => handleDoubleTapLike(postId)}>
        {mediaUrls.slice(0, 4).map((url, idx) => (
          <div key={idx} className={`relative cursor-pointer ${mediaUrls.length === 3 && idx === 0 ? 'row-span-2' : ''}`}
            onClick={() => { if (!isVideo(url)) { setGalleryImages(mediaUrls.filter(u => !isVideo(u))); setGalleryIndex(idx); } }}>
            {isVideo(url) ? (
              <div className="relative aspect-square bg-black/5 dark:bg-white/5">
                <video src={url} className="w-full h-full object-cover" playsInline muted preload="metadata"
                  onClick={(e) => { e.stopPropagation(); const vid = e.currentTarget; if (vid.paused) vid.play(); else vid.pause(); }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Play className="h-8 w-8 text-white/80 fill-white/80" />
                </div>
              </div>
            ) : (
              <img src={url} alt="" className="w-full aspect-square object-cover" loading="lazy" />
            )}
            {idx === 3 && mediaUrls.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{mediaUrls.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const visiblePosts = posts.filter(post => !blockedUserIds.includes(post.user_id));

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background"><FeedSkeleton /></div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 bg-mobile-surface overflow-hidden">
        {/* Header — Instagram-style flat white */}
        <header className="fixed top-0 left-0 right-0 z-50 safe-area-top bg-background border-b border-border">
          <div className="flex items-center gap-2 h-14 px-4 max-w-lg mx-auto">
            <button onClick={() => navigate("/sidebar")} aria-label="Menu"
              className="h-9 w-9 flex items-center justify-center active:scale-90 transition shrink-0">
              <Menu className="h-6 w-6 text-foreground" strokeWidth={2} />
            </button>
            <span className="font-display text-[24px] font-extrabold tracking-tight text-foreground">Blynk</span>
            <div className="flex-1" />
            <button onClick={() => navigate("/friends")} aria-label="Pesquisar"
              className="h-9 w-9 flex items-center justify-center active:scale-90 transition shrink-0">
              <Search className="h-6 w-6 text-foreground" strokeWidth={2} />
            </button>
            <button onClick={() => navigate("/notifications")} aria-label="Notificações"
              className="relative h-9 w-9 flex items-center justify-center active:scale-90 transition shrink-0">
              <Bell className="h-6 w-6 text-foreground" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Pull-to-refresh indicator */}
        <div className="fixed top-12 left-0 right-0 z-40 flex justify-center pointer-events-none"
          style={{ transform: `translateY(${Math.max(pullDistance - 20, 0)}px)`, opacity: pullDistance > 10 ? 1 : 0, transition: refreshing ? 'none' : 'all 0.2s ease-out' }}>
          <div className={`h-10 w-10 rounded-full bg-background shadow-lg border border-border/30 flex items-center justify-center ${refreshing ? 'animate-spin' : ''}`}>
            {refreshing ? <Loader2 className="h-5 w-5 text-primary" /> : <RefreshCw className={`h-4 w-4 text-muted-foreground transition-transform`} style={{ transform: `rotate(${pullDistance * 3}deg)` }} />}
          </div>
        </div>

        <div ref={scrollContainerRef}
          className="pt-14 pb-[100px] h-[100dvh] overflow-y-auto overscroll-contain native-scroll"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onScroll={handleScroll}
          style={{ transform: refreshing ? 'translateY(40px)' : `translateY(${pullDistance > 0 ? pullDistance * 0.3 : 0}px)`, transition: refreshing || pullDistance > 0 ? 'transform 0.3s ease-out' : 'none' }}
        >
          <div className="max-w-lg mx-auto">
            <StoriesBar onCreateStory={() => setCreateStoryOpen(true)} />

            {/* Rótulo: filhar novas pessoas (cascata motion estilo Threads) */}
            <NewUsersCascade currentUserId={currentUserId} />

            {/* Posts Feed - New unique card design */}
            <div className="space-y-2 pb-4">
              {visiblePosts.map((post, index) => {
                const userReaction = getUserReaction(post);
                const totalReactions = getLikeCount(post);
                const isSaved = savedPosts.includes(post.id);
                const showAd = index > 0 && index % 5 === 0 && sponsoredAds.length > 0;
                const adIndex = Math.floor(index / 5) % sponsoredAds.length;

                return (
                  <div key={post.id}>
                    {showAd && <div className="mb-2"><SponsoredAd ad={sponsoredAds[adIndex]} likesCount={0} isLiked={false} userId={currentUserId} /></div>}
                    
                    {/* Meta-style post card */}
                    <article
                      data-post-id={post.id}
                      ref={(el) => { postRefs.current[post.id] = el; }}
                      className="bg-card w-full border-y border-border/60 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-2.5">
                        <Avatar className="h-11 w-11 cursor-pointer" onClick={() => navigate(`/profile/${post.profiles.id}`)}>
                          <AvatarImage src={post.profiles.avatar_url} className="object-cover" />
                          <AvatarFallback className="bg-muted text-sm font-semibold">
                            {post.profiles.first_name?.[0] || post.profiles.username?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-[15px] truncate cursor-pointer" onClick={() => navigate(`/profile/${post.profiles.id}`)}>
                              {post.profiles.full_name || post.profiles.first_name || post.profiles.username}
                            </span>
                            {(post.profiles.verified || hasSpecialBadgeEmoji(post.profiles.username) || hasSpecialBadgeEmoji(post.profiles.full_name)) && (
                              <VerificationBadge verified={post.profiles.verified} badgeType={post.profiles.badge_type} username={post.profiles.username} fullName={post.profiles.full_name} className="w-[15px] h-[15px] shrink-0" />
                            )}
                            {post.user_id !== currentUserId && (
                              <button
                                onClick={() => handleFollow(post.user_id)}
                                className={`ml-1 h-[26px] shrink-0 px-2.5 rounded-full text-[12.5px] font-bold active:scale-95 transition ${
                                  following.includes(post.user_id)
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-primary text-primary-foreground'
                                }`}
                              >
                                {following.includes(post.user_id) ? 'Filhou' : 'Filhar'}
                              </button>
                            )}
                          </div>
                          <span className="text-muted-foreground text-[12.5px]">
                            {formatDistanceToNow(new Date(post.created_at), { locale: ptBR, addSuffix: false })} · @{post.profiles.username}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={() => setOptionsSheet({ open: true, post })}>
                          <MoreHorizontal className="h-[19px] w-[19px] text-muted-foreground" />
                        </Button>
                      </div>

                      {/* Text */}
                      {post.content && (
                        <p
                          className={`px-3.5 pb-2.5 text-foreground whitespace-pre-wrap break-words ${
                            (!post.media_urls || post.media_urls.length === 0) && post.content.length <= 85
                              ? post.content.length <= 45
                                ? 'text-[27px] leading-[33px] font-semibold tracking-tight'
                                : 'text-[21px] leading-[27px] font-medium'
                              : 'text-[15px] leading-[21px]'
                          }`}
                        >
                          {parseTextWithLinksAndMentions(post.content)}
                        </p>
                      )}

                      {/* Music */}
                      {post.music_name && (
                        <div className="px-3.5 pb-2.5">
                          <MusicPlayer musicName={post.music_name} musicArtist={post.music_artist} musicUrl={post.music_url} autoPlayInView />
                        </div>
                      )}

                      {/* Media — edge to edge */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className="[&_img]:rounded-none [&_video]:rounded-none [&>div]:rounded-none">
                          {renderMediaGrid(post.media_urls, post.id)}
                        </div>
                      )}

                      {/* Reações rápidas (emojis + stickers de apps) */}
                      <div className="px-3.5 pt-1.5">
                        <StickerReactions onSelect={(value) => handleStickerReaction(post.id, value)} />
                      </div>

                      {/* Counters */}
                      {(totalReactions > 0 || post.comments.length > 0) && (
                        <div className="flex items-center gap-3 px-3.5 pt-2.5 text-[13px] text-muted-foreground">
                          {totalReactions > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="h-[18px] w-[18px] rounded-full bg-red-500 flex items-center justify-center">
                                <Heart className="h-[11px] w-[11px] text-white fill-white" />
                              </span>
                              <span className="tabular-nums font-medium">{totalReactions}</span>
                            </span>
                          )}
                          <div className="flex-1" />
                          {post.comments.length > 0 && (
                            <button onClick={() => navigate(`/comments/${post.id}`)} className="tabular-nums">
                              {post.comments.length} comentários
                            </button>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-2.5 mx-3.5 border-t border-border/50 flex items-center justify-around py-1">
                        <motion.button onClick={() => handleLike(post.id)} whileTap={{ scale: 0.9 }}
                          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl hover:bg-muted/50 transition-colors">
                          <Heart className={`h-[21px] w-[21px] transition-all ${userReaction ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} strokeWidth={1.9} />
                          <span className={`text-[13.5px] font-semibold ${userReaction ? 'text-red-500' : 'text-muted-foreground'}`}>Gostar</span>
                        </motion.button>
                        <button onClick={() => navigate(`/comments/${post.id}`)}
                          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl hover:bg-muted/50 transition-colors">
                          <MessageCircle className="h-[21px] w-[21px] text-muted-foreground" strokeWidth={1.9} />
                          <span className="text-[13.5px] font-semibold text-muted-foreground">Comentar</span>
                        </button>
                        <button onClick={() => {
                          navigator.share?.({ title: 'Publicação', text: post.content?.slice(0, 100), url: `${window.location.origin}/post/${post.id}` })
                            .catch(() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); toast.success("Link copiado!"); });
                        }} className="h-11 w-11 flex items-center justify-center rounded-xl hover:bg-muted/50 transition-colors">
                          <Send className="h-[19px] w-[19px] text-muted-foreground" strokeWidth={1.9} />
                        </button>
                        <motion.button onClick={() => handleSave(post.id)} whileTap={{ scale: 0.9 }}
                          className="h-11 w-11 flex items-center justify-center rounded-xl hover:bg-muted/50 transition-colors">
                          <Bookmark className={`h-[19px] w-[19px] ${isSaved ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} strokeWidth={1.9} />
                        </motion.button>
                      </div>
                    </article>
                  </div>
                );
              })}

              {loadingMore && (
                <div className="py-6 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!hasMore && visiblePosts.length > 0 && (
                <div className="py-8 text-center">
                  <p className="text-[12px] text-muted-foreground/60">Estás atualizado ✓</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <BottomNav />

        {optionsSheet.post && (
          <PostOptionsSheet open={optionsSheet.open} onOpenChange={(open) => setOptionsSheet({ ...optionsSheet, open })}
            postId={optionsSheet.post.id} postUserId={optionsSheet.post.user_id} currentUserId={currentUserId} mediaUrls={optionsSheet.post.media_urls} />
        )}

        <CreateStory open={createStoryOpen} onOpenChange={setCreateStoryOpen} />
        {galleryImages && <ImageGalleryViewer images={galleryImages} initialIndex={galleryIndex} onClose={() => setGalleryImages(null)} />}
      </div>
    </ProtectedRoute>
  );
}
