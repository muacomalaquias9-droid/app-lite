import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, BadgeCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { readSnapshot, writeSnapshot } from "@/lib/snapshot";

type P = { id: string; username: string; first_name?: string | null; avatar_url?: string | null; verified?: boolean | null };

const TABS = ["Para ti", "Filhando", "Novos"] as const;

export default function FeedDiscover({ currentUserId }: { currentUserId: string | null }) {
  const navigate = useNavigate();
  const [me, setMe] = useState<P | null>(() => readSnapshot<P | null>("disc-me", null));
  const [people, setPeople] = useState<P[]>(() => readSnapshot<P[]>("disc-people", []));
  const [rec, setRec] = useState<(P & { followers: number })[]>(() => readSnapshot<(P & { followers: number })[]>("disc-rec", []));
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<(typeof TABS)[number]>("Para ti");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const [{ data: meData }, { data: fol }, { count }] = await Promise.all([
        supabase.from("profiles").select("id,username,first_name,avatar_url,verified").eq("id", currentUserId).maybeSingle(),
        supabase.from("follows").select("following_id").eq("follower_id", currentUserId),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", currentUserId).eq("is_read", false),
      ]);
      if (meData) { setMe(meData as P); writeSnapshot("disc-me", meData); }
      const ids = new Set<string>((fol || []).map((f: any) => f.following_id));
      setFollowing(ids);
      setUnread(count || 0);
    })();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      let q = supabase.from("profiles").select("id,username,first_name,avatar_url,verified").not("avatar_url", "is", null).neq("id", currentUserId).limit(12);
      if (tab === "Filhando") {
        const ids = Array.from(following);
        if (!ids.length) { setPeople([]); return; }
        q = q.in("id", ids);
      } else if (tab === "Novos") q = q.order("created_at", { ascending: false });
      else q = q.order("verified", { ascending: false });
      const { data } = await q;
      setPeople((data as P[]) || []);
      if (tab === "Para ti") writeSnapshot("disc-people", data || []);
    })();
  }, [tab, currentUserId, following]);

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id,username,first_name,avatar_url,verified").not("avatar_url", "is", null).neq("id", currentUserId).limit(30);
      const list = ((data as P[]) || []).sort(() => Math.random() - 0.5).slice(0, 10);
      const withCounts = await Promise.all(list.map(async (p) => {
        const { count } = await supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", p.id);
        return { ...p, followers: count || 0 };
      }));
      setRec(withCounts); writeSnapshot("disc-rec", withCounts);
    })();
  }, [currentUserId]);

  const toggleFollow = async (id: string) => {
    if (!currentUserId) return;
    const isF = following.has(id);
    const next = new Set(following); isF ? next.delete(id) : next.add(id); setFollowing(next);
    if (isF) await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", id);
    else await supabase.from("follows").insert({ follower_id: currentUserId, following_id: id });
  };

  const name = (p: P) => p.first_name || p.username;

  return (
    <div className="pb-2">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <button onClick={() => me && navigate(`/profile/${me.id}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
          <img src={me?.avatar_url || "/placeholder.svg"} alt="" className="h-12 w-12 rounded-full object-cover bg-muted" />
          <div className="min-w-0">
            <p className="text-[17px] font-semibold text-foreground truncate leading-tight">{me ? name(me) : "…"}</p>
            <p className="text-[13px] text-muted-foreground truncate">@{me?.username || ""}</p>
          </div>
        </button>
        <button onClick={() => navigate("/notifications")} aria-label="Notificações" className="relative h-10 w-10 flex items-center justify-center active:scale-90 transition">
          <Bell className="h-6 w-6 text-foreground" strokeWidth={1.8} />
          {unread > 0 && <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-muted-foreground text-background text-[10px] font-semibold flex items-center justify-center">{unread > 99 ? "99+" : unread}</span>}
        </button>
        <button onClick={() => navigate("/friends")} aria-label="Pesquisar" className="h-10 w-10 flex items-center justify-center active:scale-90 transition">
          <Search className="h-6 w-6 text-foreground" strokeWidth={1.8} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 pl-5 pt-4 pb-4 overflow-x-auto no-scrollbar" data-no-swipe>
        <h2 className="text-[19px] font-bold text-foreground shrink-0 mr-2">A seguir</h2>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 h-10 px-5 rounded-full text-[14px] font-medium transition ${tab === t ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
            {t}
          </button>
        ))}
        <span className="w-2 shrink-0" />
      </div>

      {/* Tall cards */}
      <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar snap-x" data-no-swipe>
        {people.length === 0 && <p className="text-sm text-muted-foreground py-10">Ainda não filhas ninguém.</p>}
        {people.map((p) => (
          <button key={p.id} onClick={() => navigate(`/profile/${p.id}`)}
            className="relative shrink-0 w-[132px] h-[218px] rounded-[22px] overflow-hidden snap-start active:scale-[0.97] transition bg-muted">
            <img src={p.avatar_url!} alt={name(p)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-foreground/70 to-transparent dark:from-background/80" />
            <span className="absolute bottom-3 inset-x-2 flex items-center justify-center gap-1 text-[14px] font-medium text-background dark:text-foreground truncate">
              {name(p)} {p.verified && <BadgeCheck className="h-4 w-4 shrink-0" />}
            </span>
          </button>
        ))}
      </div>

      {/* Recommend */}
      <div className="flex items-center justify-between px-5 pt-7 pb-3">
        <h2 className="text-[19px] font-bold text-foreground">Recomendados</h2>
        <button onClick={() => navigate("/friends")} className="text-[14px] text-muted-foreground">Mais</button>
      </div>
      <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar snap-x pb-4" data-no-swipe>
        {rec.map((p) => (
          <div key={p.id} className="shrink-0 w-[132px] rounded-[18px] bg-muted/60 overflow-hidden snap-start">
            <button onClick={() => navigate(`/profile/${p.id}`)} className="relative block w-full h-[112px]">
              <img src={p.avatar_url!} alt={name(p)} loading="lazy" className="h-full w-full object-cover rounded-[18px]" />
              <span onClick={(e) => { e.stopPropagation(); toggleFollow(p.id); }}
                className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-background/80 backdrop-blur-md text-foreground">
                {following.has(p.id) ? "Filhou" : "Filhar"}
              </span>
            </button>
            <div className="px-2.5 py-2">
              <p className="flex items-center gap-1 text-[13px] font-semibold text-foreground truncate">{name(p)} {p.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0" />}</p>
              <p className="text-[11px] text-muted-foreground">{p.followers} seguidores</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
