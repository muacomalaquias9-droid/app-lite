import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import VerificationBadge from '@/components/VerificationBadge';

interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  verified?: boolean;
  badge_type?: string | null;
}

/** Página de pesquisa de utilizadores — design Threads (fundo claro, letras escuras). */
export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [suggested, setSuggested] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const SELECT = 'id, username, first_name, full_name, avatar_url, bio, verified, badge_type';

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select(SELECT).order('created_at', { ascending: false }).limit(30);
      if (data) setSuggested(data.filter((p: any) => p.id !== user?.id) as any);
      if (user) {
        const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        if (f) setFollowing(f.map((r: any) => r.following_id));
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select(SELECT)
        .or(`username.ilike.%${term}%,first_name.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(30);
      setResults((data || []).filter((p: any) => p.id !== user?.id) as any);
      setLoading(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [query, user]);

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

  const list = query.trim() ? results : suggested;

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto native-scroll bg-background text-foreground pb-28">
        <div className="mx-auto w-full max-w-xl">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md safe-area-top">
            <div className="px-4 pt-4 pb-2">
              <h1 className="text-[26px] font-bold tracking-tight">Pesquisar</h1>
            </div>
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar pessoas"
                  className="w-full h-11 pl-11 pr-10 rounded-2xl bg-muted/70 text-foreground placeholder:text-muted-foreground border border-border/60 focus:outline-none focus:border-border"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="Limpar"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="px-4 pt-1 pb-2 text-[13px] font-medium text-muted-foreground">
            {query.trim() ? (loading ? 'A pesquisar...' : `${list.length} resultado(s)`) : 'Sugestões para ti'}
          </p>

          <div>
            {list.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i, 10) * 0.02 }}
                className="flex items-start gap-3 px-4 py-3.5 border-b border-border/60"
              >
                <button onClick={() => navigate(`/profile/${p.id}`)}>
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={p.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-muted font-semibold">{(p.first_name || p.username || '?')[0]}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="min-w-0 flex-1" onClick={() => navigate(`/profile/${p.id}`)}>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-[15px] truncate">{p.username}</span>
                    {p.verified && <VerificationBadge verified badgeType={p.badge_type} size="sm" />}
                  </div>
                  <p className="text-[14px] text-muted-foreground truncate">{p.full_name || p.first_name}</p>
                  {p.bio && <p className="text-[14px] mt-0.5 line-clamp-2">{p.bio}</p>}
                </div>
                <button
                  onClick={() => toggleFollow(p.id)}
                  className={`shrink-0 h-9 min-w-[92px] px-4 rounded-xl border text-[14px] font-semibold transition-colors ${
                    following.includes(p.id)
                      ? 'border-border text-muted-foreground bg-transparent'
                      : 'border-border text-foreground bg-transparent'
                  }`}
                >
                  {following.includes(p.id) ? 'Filhou' : 'Filhar'}
                </button>
              </motion.div>
            ))}
            {!loading && list.length === 0 && (
              <p className="px-4 py-10 text-center text-muted-foreground text-sm">Nenhum utilizador encontrado.</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
