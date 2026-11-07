import { useEffect, useState, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, X, Loader2, ArrowLeft, Clock3, SlidersHorizontal, Heart, Play, Pause, Music2, Hash, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VerificationBadge from '@/components/VerificationBadge';
import StickerSuggestions from '@/components/StickerSuggestions';

interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  verified?: boolean;
  badge_type?: string | null;
  isPage?: boolean;
}

interface ExplorePost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    first_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  post_likes?: { count: number }[];
}

interface MusicResult {
  id: string;
  name: string;
  artist: string;
  cover: string;
  preview?: string;
}

type SearchTab = 'Top' | 'Usuários' | 'Vídeos' | 'Sons' | 'Hashtags';

const PAGE_SIZE = 20;
const SEARCH_TABS: SearchTab[] = ['Top', 'Usuários', 'Vídeos', 'Sons', 'Hashtags'];
const DISCOVERY_TOPICS = ['Em alta', 'Música', 'Humor', 'Moda', 'Dança', 'Angola'];
const HISTORY_KEY = 'paji-search-history';
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i;

const readHistory = (): string[] => {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
};

/** Pesquisa e descoberta de publicações, pessoas, vídeos, sons e hashtags. */
export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('Top');
  const [history, setHistory] = useState<string[]>(readHistory);
  const [activeSticker, setActiveSticker] = useState<string | undefined>();
  const [results, setResults] = useState<Profile[]>([]);
  const [suggested, setSuggested] = useState<Profile[]>([]);
  const [explorePosts, setExplorePosts] = useState<ExplorePost[]>([]);
  const [postResults, setPostResults] = useState<ExplorePost[]>([]);
  const [musicResults, setMusicResults] = useState<MusicResult[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const SELECT = 'id, username, first_name, full_name, avatar_url, bio, verified, badge_type';
  const POST_SELECT = 'id, content, media_urls, created_at, user_id, profiles!inner(id, username, first_name, full_name, avatar_url), post_likes(count)';

  useEffect(() => {
    const load = async () => {
      const [profilesResponse, followsResponse, postsResponse] = await Promise.all([
        supabase.from('profiles').select(`${SELECT}, is_public`).eq('is_public', true).order('created_at', { ascending: false }).limit(30),
        user ? supabase.from('follows').select('following_id').eq('follower_id', user.id) : Promise.resolve({ data: [] as { following_id: string }[] }),
        supabase.from('posts').select(POST_SELECT).eq('profiles.is_public', true).order('created_at', { ascending: false }).limit(60),
      ]);
      if (profilesResponse.data) setSuggested(profilesResponse.data.filter((profile) => profile.id !== user?.id) as Profile[]);
      if (followsResponse.data) setFollowing(followsResponse.data.map((row) => row.following_id));
      if (postsResponse.data) setExplorePosts(postsResponse.data as unknown as ExplorePost[]);
    };
    load();
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [user]);

  const fetchPage = useCallback(async (term: string, page: number) => {
    const from = page * PAGE_SIZE;
    const [{ data }, { data: pages }] = await Promise.all([
      supabase.from('profiles').select(SELECT)
        .eq('is_public', true)
        .or(`username.ilike.%${term}%,first_name.ilike.%${term}%,full_name.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1),
      page === 0
        ? supabase.from('page_profiles').select('id, name, avatar_url, bio')
            .ilike('name', `%${term}%`).limit(10)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const rows = (data || []).filter((p: any) => p.id !== user?.id) as Profile[];
    const pageRows: Profile[] = (pages || []).map((p: any) => ({
      id: p.id,
      username: p.name,
      first_name: p.name,
      full_name: p.name,
      avatar_url: p.avatar_url,
      bio: p.bio,
      isPage: true,
    }));
    setHasMore((data || []).length === PAGE_SIZE);
    return [...pageRows, ...rows];
  }, [user]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setPostResults([]);
      setMusicResults([]);
      setHasMore(true);
      pageRef.current = 0;
      setLoading(false);
      setPostsLoading(false);
      setMusicLoading(false);
      return;
    }
    setLoading(true);
    setPostsLoading(true);
    const timer = setTimeout(async () => {
      pageRef.current = 0;
      const rows = await fetchPage(term, 0);
      setResults(rows);
      setLoading(false);
      const { data: posts } = await supabase.from('posts')
        .select(POST_SELECT)
        .eq('profiles.is_public', true)
        .ilike('content', `%${term}%`)
        .order('created_at', { ascending: false })
        .limit(80);
      setPostResults((posts || []) as unknown as ExplorePost[]);
      setPostsLoading(false);

      setMusicLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${baseUrl}/functions/v1/music-search?query=${encodeURIComponent(term)}`, { cache: 'no-store' });
        const data = await response.json();
        setMusicResults((data.tracks || []).map((track: any) => ({
          id: String(track.id),
          name: track.name || track.title || 'Música',
          artist: track.artist || track.artist_name || 'Artista',
          cover: track.cover || track.cover_url || track.album?.cover_medium || '',
          preview: track.preview || track.audio_url,
        })));
      } catch {
        setMusicResults([]);
      } finally {
        setMusicLoading(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [query, fetchPage]);

  // Paginação por scroll nos resultados
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !query.trim() || !hasMore) return;
    const observer = new IntersectionObserver(async (entries) => {
      if (!entries[0]?.isIntersecting || loading || loadingMore) return;
      setLoadingMore(true);
      const next = pageRef.current + 1;
      const rows = await fetchPage(query.trim(), next);
      pageRef.current = next;
      setResults((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      setLoadingMore(false);
    }, { rootMargin: '160px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [query, hasMore, loading, loadingMore, fetchPage]);

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    if (following.includes(targetId)) {
      setFollowing((prev) => prev.filter((id) => id !== targetId));
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
    } else {
      setFollowing((prev) => [...prev, targetId]);
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
    }
  };

  const rememberSearch = (term: string) => {
    const value = term.trim();
    if (!value) return;
    const next = [value, ...history.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const clearHistoryItem = (term: string) => {
    const next = history.filter((item) => item !== term);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const chooseTerm = (term: string) => {
    setQuery(term);
    setActiveTab('Top');
    setActiveSticker(undefined);
    setSearchFocused(true);
    rememberSearch(term);
  };

  const visiblePosts = (query.trim() ? postResults : explorePosts).filter((post) => {
    const media = post.media_urls || [];
    if (activeTab === 'Vídeos') return media.some((url) => VIDEO_EXTENSIONS.test(url));
    if (activeTab === 'Hashtags') return Boolean(post.content?.match(/#[\p{L}\p{N}_]+/gu)?.some((tag) => tag.toLowerCase().includes(query.trim().replace(/^#/, '').toLowerCase())));
    return true;
  });

  const visibleProfiles = query.trim() ? results : suggested;
  const hashtags = [...new Set(postResults.flatMap((post) => post.content?.match(/#[\p{L}\p{N}_]+/gu) || []))]
    .filter((tag) => !query.trim() || tag.toLowerCase().includes(query.trim().replace(/^#/, '').toLowerCase()));

  const toggleMusicPreview = async (track: MusicResult) => {
    if (!track.preview) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    if (previewId === track.id) {
      audio.pause();
      setPreviewId(null);
      return;
    }
    audio.pause();
    audio.src = track.preview;
    audio.onended = () => setPreviewId(null);
    try {
      await audio.play();
      setPreviewId(track.id);
    } catch {
      setPreviewId(null);
    }
  };

  const renderProfileRows = (profiles: Profile[]) => (
    <div className="divide-y divide-border/60">
      {profiles.map((profile, index) => (
        <motion.div key={profile.id} layout initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(index, 6) * 0.015 }}
          className="flex items-center gap-3 px-4 py-3.5">
          <button type="button" onClick={() => navigate(`/profile/${profile.id}`)} aria-label={`Abrir ${profile.username}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-muted font-semibold">{(profile.first_name || profile.username || '?')[0]}</AvatarFallback>
            </Avatar>
          </button>
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/profile/${profile.id}`)}>
            <span className="flex items-center gap-1">
              <span className="truncate text-[15px] font-semibold">{profile.username}</span>
              {profile.verified && <VerificationBadge verified badgeType={profile.badge_type} size="sm" />}
              {profile.isPage && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Página</span>}
            </span>
            <span className="block truncate text-[14px] text-muted-foreground">{profile.full_name || profile.first_name}</span>
            {profile.bio && <span className="mt-0.5 line-clamp-1 block text-[13px] text-muted-foreground">{profile.bio}</span>}
          </button>
          {!profile.isPage && (
            <Button type="button" variant={following.includes(profile.id) ? 'secondary' : 'outline'} size="sm"
              onClick={() => toggleFollow(profile.id)} className="h-9 min-w-24 rounded-xl px-3 text-[13px]">
              {following.includes(profile.id) ? 'Filhou' : 'Filhar'}
            </Button>
          )}
        </motion.div>
      ))}
    </div>
  );

  const renderPostGrid = (posts: ExplorePost[]) => (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-3 sm:gap-x-4 sm:px-4">
      {posts.map((post, index) => {
        const media = post.media_urls || [];
        const cover = media[0];
        const isVideo = Boolean(cover && VIDEO_EXTENSIONS.test(cover));
        return (
          <motion.button key={post.id} type="button" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.012 }}
            onClick={() => navigate(`/post/${post.id}`)} className="min-w-0 text-left">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
              {cover && isVideo ? (
                <video src={cover} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : cover ? (
                <img src={cover} alt="" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
              ) : (
                <div className="flex h-full items-center justify-center p-5 text-center text-[16px] font-semibold leading-relaxed">{post.content || 'Publicação'}</div>
              )}
              {isVideo && <span className="absolute right-2 top-2 rounded-full bg-background/70 p-2 text-foreground backdrop-blur-md"><Play className="h-4 w-4 fill-current" /></span>}
              {post.content && cover && <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-background/85 to-transparent px-3 pb-3 pt-8 text-[13px] font-medium text-foreground">{post.content}</span>}
            </div>
            <span className="mt-2 flex min-w-0 items-center gap-2 px-0.5">
              <Avatar className="h-6 w-6 shrink-0"><AvatarImage src={post.profiles.avatar_url || undefined} /><AvatarFallback className="bg-muted text-[10px]">{(post.profiles.first_name || post.profiles.username || '?')[0]}</AvatarFallback></Avatar>
              <span className="truncate text-[13px] text-muted-foreground">{post.profiles.username}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground"><Heart className="h-3.5 w-3.5" />{post.post_likes?.[0]?.count || 0}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );

  const renderMusicRows = () => (
    <div className="divide-y divide-border/60 px-4">
      {musicResults.map((track) => (
        <div key={track.id} className="flex items-center gap-3 py-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            {track.cover ? <img src={track.cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Music2 className="h-5 w-5 text-muted-foreground" /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{track.name}</p>
            <p className="truncate text-[13px] text-muted-foreground">{track.artist}</p>
          </div>
          <Button type="button" variant="secondary" size="icon" onClick={() => void toggleMusicPreview(track)} aria-label={previewId === track.id ? 'Pausar música' : 'Ouvir música'} className="h-10 w-10 shrink-0 rounded-full">
            {previewId === track.id ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </Button>
        </div>
      ))}
    </div>
  );

  const renderEmpty = (message: string) => (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Search className="h-6 w-6 text-muted-foreground" /></div>
      <p className="max-w-[280px] text-[14px] text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto native-scroll bg-background pb-28 text-foreground">
        <div className="mx-auto w-full max-w-5xl">
          <header className="sticky top-0 z-20 border-b border-border/50 bg-background/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              {searchFocused && <Button type="button" variant="ghost" size="icon" onClick={() => { setSearchFocused(false); setQuery(''); setActiveTab('Top'); }} aria-label="Voltar" className="h-10 w-10 shrink-0 rounded-full"><ArrowLeft className="h-5 w-5" /></Button>}
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(event) => { setQuery(event.target.value); setActiveSticker(undefined); setActiveTab('Top'); }}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { rememberSearch(query); (event.target as HTMLInputElement).blur(); } }}
                  placeholder="Descubra novos tópicos" aria-label="Pesquisar pessoas e publicações"
                  className="h-12 w-full rounded-2xl border border-border/60 bg-muted/60 pl-11 pr-11 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20" />
                {query && <Button type="button" variant="ghost" size="icon" onClick={() => { setQuery(''); setActiveSticker(undefined); }} aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"><X className="h-4 w-4" /></Button>}
              </div>
              <Button type="button" variant="ghost" onClick={() => { setSearchFocused(true); rememberSearch(query); }} className="h-10 shrink-0 px-1 text-[15px] font-semibold text-primary sm:px-3">Procurar</Button>
              {query.trim() && <Button type="button" variant="ghost" size="icon" aria-label="Filtros" className="hidden h-10 w-10 shrink-0 rounded-full sm:inline-flex"><SlidersHorizontal className="h-5 w-5" /></Button>}
            </div>
          </header>

          {searchFocused && !query.trim() ? (
            <section className="px-4 pb-8 pt-5">
              {history.length > 0 && <div className="mb-7">
                <div className="mb-2 flex items-center justify-between"><h2 className="text-[17px] font-bold">Pesquisas recentes</h2><Button type="button" variant="ghost" onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }} className="h-8 px-2 text-[13px] text-primary">Limpar tudo</Button></div>
                <div className="divide-y divide-border/50">
                  {history.map((term) => <div key={term} className="flex items-center gap-3 py-3">
                    <Clock3 className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <Button type="button" variant="ghost" onClick={() => chooseTerm(term)} className="h-auto min-w-0 flex-1 justify-start truncate p-0 text-left text-[15px] font-normal">{term}</Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => clearHistoryItem(term)} aria-label={`Remover ${term}`} className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"><X className="h-4 w-4" /></Button>
                  </div>)}
                </div>
              </div>}
              <h2 className="mb-2 text-[17px] font-bold">Você pode curtir</h2>
              <div className="divide-y divide-border/50">
                {DISCOVERY_TOPICS.map((topic, index) => <Button key={topic} type="button" variant="ghost" onClick={() => chooseTerm(topic)} className="h-auto w-full justify-start gap-3 px-1 py-3 text-left text-[15px] font-medium">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index < 3 ? 'bg-primary' : 'bg-muted-foreground/50'}`} />{topic}
                </Button>)}
              </div>
              <div className="mt-6"><StickerSuggestions activeTerm={activeSticker} onPick={(sticker) => { setActiveSticker(sticker.term); chooseTerm(sticker.term); }} /></div>
            </section>
          ) : (
            <>
              {!query.trim() ? (
                <>
                  <div className="flex gap-2 overflow-x-auto px-4 py-4 no-scrollbar" data-no-swipe>
                    {DISCOVERY_TOPICS.map((topic) => <Button key={topic} type="button" variant="secondary" onClick={() => chooseTerm(topic)} className="h-10 shrink-0 rounded-full px-4 text-[14px]">{topic}</Button>)}
                  </div>
                  <div className="mb-4 flex items-center justify-between px-4"><h1 className="text-[21px] font-bold">Descobrir</h1><UserRound className="h-5 w-5 text-muted-foreground" /></div>
                  {explorePosts.length > 0 ? renderPostGrid(explorePosts) : renderEmpty('As publicações em destaque vão aparecer aqui.')}
                  {suggested.length > 0 && <section className="mt-8"><div className="mb-1 px-4"><h2 className="text-[18px] font-bold">Pessoas para conhecer</h2></div>{renderProfileRows(suggested.slice(0, 8))}</section>}
                </>
              ) : (
                <>
                  <nav className="sticky top-[68px] z-10 flex gap-7 overflow-x-auto border-b border-border/60 bg-background/95 px-4 no-scrollbar" aria-label="Categorias de pesquisa">
                    {SEARCH_TABS.map((tab) => <Button key={tab} type="button" variant="ghost" onClick={() => setActiveTab(tab)} className={`relative h-12 shrink-0 rounded-none px-1 text-[15px] ${activeTab === tab ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {tab}{activeTab === tab && <motion.span layoutId="search-tab-indicator" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />}
                    </Button>)}
                  </nav>
                  <div className="flex min-h-10 items-center justify-between px-4 py-2 text-[13px] text-muted-foreground">
                    <span>{activeTab === 'Usuários' ? (loading ? 'A pesquisar…' : `${visibleProfiles.length} pessoas`) : activeTab === 'Sons' ? `${musicResults.length} sons` : `${visiblePosts.length} publicações`}</span>
                    {(loading || postsLoading || musicLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.section key={activeTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.16 }}>
                      {activeTab === 'Usuários' ? (
                        visibleProfiles.length ? renderProfileRows(visibleProfiles) : !loading ? renderEmpty('Não encontrámos pessoas com este nome.') : null
                      ) : activeTab === 'Sons' ? (
                        musicResults.length ? renderMusicRows() : !musicLoading ? renderEmpty('Não encontrámos sons para esta pesquisa.') : null
                      ) : activeTab === 'Hashtags' ? (
                        hashtags.length ? <div className="divide-y divide-border/50 px-4">{hashtags.map((tag) => <Button key={tag} type="button" variant="ghost" onClick={() => chooseTerm(tag)} className="h-auto w-full justify-start gap-3 px-1 py-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><Hash className="h-5 w-5" /></span><span><span className="block text-[15px] font-semibold">{tag}</span><span className="text-[13px] text-muted-foreground">Explorar publicações</span></span></Button>)}</div> : !postsLoading ? renderEmpty('Ainda não há hashtags relacionadas a esta pesquisa.') : null
                      ) : (
                        visiblePosts.length ? renderPostGrid(visiblePosts) : !postsLoading ? renderEmpty('Não encontrámos publicações com este tópico.') : null
                      )}
                    </motion.section>
                  </AnimatePresence>
                  {activeTab === 'Usuários' && <div ref={sentinelRef} className="h-6" />}
                  {loadingMore && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
