import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReelItem {
  id: string;
  source: 'video' | 'post';
  video_url: string;
  caption: string | null;
  user_id: string;
  username: string;
  first_name: string | null;
  avatar_url: string | null;
  likes: number;
  comments: number;
  liked: boolean;
}

const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

export default function Reels() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const [videosRes, postsRes] = await Promise.all([
        supabase
          .from('verification_videos')
          .select('id, video_url, caption, user_id, created_at, profiles!verification_videos_user_id_fkey(username, first_name, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('posts')
          .select('id, content, media_urls, user_id, created_at, profiles!posts_user_id_fkey(username, first_name, avatar_url)')
          .not('media_urls', 'is', null)
          .order('created_at', { ascending: false })
          .limit(120),
      ]);

      const list: ReelItem[] = [];

      (videosRes.data || []).forEach((v: any) => {
        list.push({
          id: v.id,
          source: 'video',
          video_url: v.video_url,
          caption: v.caption,
          user_id: v.user_id,
          username: v.profiles?.username || 'utilizador',
          first_name: v.profiles?.first_name || null,
          avatar_url: v.profiles?.avatar_url || null,
          likes: 0,
          comments: 0,
          liked: false,
        });
      });

      (postsRes.data || []).forEach((p: any) => {
        const url = (p.media_urls || []).find((m: string) => isVideoUrl(m));
        if (!url) return;
        list.push({
          id: p.id,
          source: 'post',
          video_url: url,
          caption: p.content,
          user_id: p.user_id,
          username: p.profiles?.username || 'utilizador',
          first_name: p.profiles?.first_name || null,
          avatar_url: p.profiles?.avatar_url || null,
          likes: 0,
          comments: 0,
          liked: false,
        });
      });

      // Contagens reais
      await Promise.all(
        list.map(async (item) => {
          if (item.source === 'video') {
            const [likes, comments, mine] = await Promise.all([
              supabase.from('verification_video_likes').select('id', { count: 'exact', head: true }).eq('video_id', item.id),
              supabase.from('verification_video_comments').select('id', { count: 'exact', head: true }).eq('video_id', item.id),
              user ? supabase.from('verification_video_likes').select('id').eq('video_id', item.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null } as any),
            ]);
            item.likes = likes.count || 0;
            item.comments = comments.count || 0;
            item.liked = !!mine.data;
          } else {
            const [likes, comments, mine] = await Promise.all([
              supabase.from('post_likes').select('id', { count: 'exact', head: true }).eq('post_id', item.id),
              supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', item.id),
              user ? supabase.from('post_likes').select('id').eq('post_id', item.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null } as any),
            ]);
            item.likes = likes.count || 0;
            item.comments = comments.count || 0;
            item.liked = !!mine.data;
          }
        })
      );

      setItems(list);
      setLoading(false);
    };
    load();
  }, []);

  // Autoplay por visibilidade (apenas um vídeo por vez)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.75 }
    );
    Object.values(videoRefs.current).forEach((v) => v && observer.observe(v));
    return () => observer.disconnect();
  }, [items]);

  const toggleLike = async (item: ReelItem) => {
    if (!userId) return;
    const liked = item.liked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, liked: !liked, likes: i.likes + (liked ? -1 : 1) } : i)));
    const table = item.source === 'video' ? 'verification_video_likes' : 'post_likes';
    const column = item.source === 'video' ? 'video_id' : 'post_id';
    if (liked) {
      await supabase.from(table).delete().eq(column, item.id).eq('user_id', userId);
    } else {
      await supabase.from(table).insert({ [column]: item.id, user_id: userId } as any);
    }
  };

  const share = async (item: ReelItem) => {
    const url = `${window.location.origin}/reels`;
    try {
      if (navigator.share) await navigator.share({ title: 'Reels', url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
      }
    } catch { /* cancelado */ }
  };

  const togglePause = (id: string) => {
    const video = videoRefs.current[id];
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPaused(null);
    } else {
      video.pause();
      setPaused(id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Topo */}
      <div className="absolute top-0 left-0 right-0 z-20 safe-area-top flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full flex items-center justify-center active:scale-90 transition">
          <ArrowLeft className="h-6 w-6 text-white drop-shadow-lg" />
        </button>
        <span className="text-white font-bold text-lg drop-shadow-lg">Reels</span>
        <button onClick={() => setMuted((m) => !m)} className="h-9 w-9 rounded-full flex items-center justify-center active:scale-90 transition">
          {muted ? <VolumeX className="h-6 w-6 text-white drop-shadow-lg" /> : <Volume2 className="h-6 w-6 text-white drop-shadow-lg" />}
        </button>
      </div>

      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-8">
          <Play className="h-14 w-14 text-white/30 mb-4" />
          <h3 className="text-white text-xl font-bold mb-1">Sem reels</h3>
          <p className="text-white/60 text-sm">Publica um vídeo para aparecer aqui.</p>
        </div>
      ) : (
        <div className="h-full overflow-y-auto snap-y snap-mandatory native-scroll">
          {items.map((item) => (
            <div key={`${item.source}-${item.id}`} className="relative h-full w-full snap-start snap-always">
              <video
                ref={(el) => { videoRefs.current[item.id] = el; }}
                src={item.video_url}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                playsInline
                muted={muted}
                preload="metadata"
                onClick={() => togglePause(item.id)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

              <AnimatePresence>
                {paused === item.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-black/40 rounded-full p-5">
                      <Play className="h-12 w-12 text-white fill-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ações */}
              <div className="absolute right-3 bottom-28 flex flex-col items-center gap-6 z-10">
                <button onClick={() => toggleLike(item)} className="flex flex-col items-center gap-1 active:scale-90 transition">
                  <Heart className={cn('h-7 w-7 drop-shadow-lg', item.liked ? 'text-red-500 fill-red-500' : 'text-white')} />
                  <span className="text-white text-xs font-semibold">{item.likes}</span>
                </button>
                <button
                  onClick={() => navigate(item.source === 'post' ? `/comments/${item.id}` : `/comments-video/${item.id}`)}
                  className="flex flex-col items-center gap-1 active:scale-90 transition"
                >
                  <MessageCircle className="h-7 w-7 text-white drop-shadow-lg" />
                  <span className="text-white text-xs font-semibold">{item.comments}</span>
                </button>
                <button onClick={() => share(item)} className="active:scale-90 transition">
                  <Share2 className="h-7 w-7 text-white drop-shadow-lg" />
                </button>
              </div>

              {/* Info */}
              <div className="absolute bottom-24 left-4 right-20 z-10">
                <button onClick={() => navigate(`/profile/${item.user_id}`)} className="flex items-center gap-3 mb-2">
                  <Avatar className="h-9 w-9 border-2 border-white">
                    <AvatarImage src={item.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="text-xs">{(item.first_name || item.username)[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-white font-bold text-sm drop-shadow-lg">@{item.username}</span>
                </button>
                {item.caption && (
                  <p className="text-white text-sm drop-shadow-lg line-clamp-2">{item.caption}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
