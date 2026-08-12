import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import VerificationBadge from '@/components/VerificationBadge';

interface NewUser {
  id: string;
  username: string;
  first_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  verified?: boolean;
  badge_type?: string | null;
}

/** Rótulo de "Filhar novas pessoas": cascata em motion com contas recém-criadas (estilo Threads). */
export default function NewUsersCascade({ currentUserId }: { currentUserId?: string | null }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<NewUser[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, first_name, full_name, avatar_url, verified, badge_type')
        .order('created_at', { ascending: false })
        .limit(12);
      if (data) setUsers(data.filter((u: any) => u.id !== currentUserId) as any);
      if (currentUserId) {
        const { data: f } = await supabase.from('follows').select('following_id').eq('follower_id', currentUserId);
        if (f) setFollowing(f.map((r: any) => r.following_id));
      }
    };
    load();
  }, [currentUserId]);

  const toggleFollow = async (id: string) => {
    if (!currentUserId) return;
    if (following.includes(id)) {
      setFollowing((prev) => prev.filter((x) => x !== id));
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', id);
    } else {
      setFollowing((prev) => [...prev, id]);
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: id });
      setTimeout(() => setDismissed((prev) => [...prev, id]), 700);
    }
  };

  const visible = users.filter((u) => !dismissed.includes(u.id));
  if (visible.length === 0) return null;

  return (
    <section className="border-b border-border/60 py-3">
      <div className="flex items-center justify-between px-4 pb-2">
        <h2 className="text-[15px] font-bold tracking-tight">Filhar novas pessoas</h2>
        <span className="text-[12px] text-muted-foreground">Novas contas</span>
      </div>
      <div className="flex flex-col">
        <AnimatePresence initial={false}>
          {visible.slice(0, 6).map((u, i) => (
            <motion.div
              key={u.id}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, height: 0, marginTop: 0, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 320, damping: 26, delay: i * 0.06 }}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <button onClick={() => navigate(`/profile/${u.id}`)} className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-muted font-semibold">{(u.first_name || u.username || '?')[0]}</AvatarFallback>
                </Avatar>
                <motion.span
                  className="absolute -inset-0.5 rounded-full border border-primary/60"
                  animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.18, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }}
                />
              </button>
              <div className="min-w-0 flex-1" onClick={() => navigate(`/profile/${u.id}`)}>
                <div className="flex items-center gap-1">
                  <span className="text-[14.5px] font-semibold truncate">{u.username}</span>
                  {u.verified && <VerificationBadge verified badgeType={u.badge_type} size="sm" />}
                </div>
                <p className="text-[13px] text-muted-foreground truncate">{u.full_name || u.first_name}</p>
              </div>
              <button
                onClick={() => toggleFollow(u.id)}
                className="shrink-0 h-8 min-w-[86px] px-3.5 rounded-xl border border-border text-[13.5px] font-semibold active:scale-95 transition-transform"
              >
                {following.includes(u.id) ? 'Filhou' : 'Filhar'}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
