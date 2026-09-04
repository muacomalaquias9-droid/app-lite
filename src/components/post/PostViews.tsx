import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Eye, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VerificationBadge from "@/components/VerificationBadge";

interface Viewer {
  id: string;
  username: string;
  full_name: string | null;
  first_name: string | null;
  avatar_url: string | null;
  verified?: boolean;
  badge_type?: string | null;
}

interface PostViewsProps {
  postId: string;
  currentUserId?: string;
}

const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")} mil`;
  return `${n}`;
};

/** Visualizações reais da publicação: número + avatares de quem viu (aberto a todos). */
export default function PostViews({ postId, currentUserId }: PostViewsProps) {
  const navigate = useNavigate();
  const anchorRef = useRef<HTMLDivElement>(null);
  const registered = useRef(false);
  const [count, setCount] = useState(0);
  const [preview, setPreview] = useState<Viewer[]>([]);
  const [open, setOpen] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchProfiles = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, first_name, avatar_url, verified, badge_type")
      .in("id", ids);
    const byId = new Map((data || []).map((p: any) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as Viewer[];
  }, []);

  const loadSummary = useCallback(async () => {
    const [{ count: total }, { data: recent }] = await Promise.all([
      supabase.from("post_views").select("id", { count: "exact", head: true }).eq("post_id", postId),
      supabase.from("post_views").select("user_id").eq("post_id", postId)
        .order("created_at", { ascending: false }).limit(3),
    ]);
    setCount(total || 0);
    setPreview(await fetchProfiles((recent || []).map((r: any) => r.user_id)));
  }, [postId, fetchProfiles]);

  // Registra a visualização real quando a publicação aparece no ecrã
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        if (currentUserId && !registered.current) {
          registered.current = true;
          await supabase.from("post_views").insert({ post_id: postId, user_id: currentUserId });
        }
        loadSummary();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [postId, currentUserId, loadSummary]);

  const openList = async () => {
    setOpen(true);
    setLoadingList(true);
    const { data } = await supabase.from("post_views").select("user_id").eq("post_id", postId)
      .order("created_at", { ascending: false }).limit(200);
    setViewers(await fetchProfiles((data || []).map((r: any) => r.user_id)));
    setLoadingList(false);
  };

  return (
    <div ref={anchorRef}>
      <button
        type="button"
        onClick={openList}
        className="flex items-center gap-2 active:scale-[0.98] transition"
      >
        {preview.length > 0 && (
          <div className="flex -space-x-2">
            {preview.map((v) => (
              <Avatar key={v.id} className="h-[18px] w-[18px] ring-2 ring-card">
                <AvatarImage src={v.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="text-[8px]">{(v.first_name || v.username || "U")[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
        <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <Eye className="h-[15px] w-[15px]" />
          <span className="tabular-nums font-medium text-foreground">{formatCount(count)}</span>
          <span>{count === 1 ? "visualização" : "visualizações"}</span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
            <SheetTitle className="text-[16px]">
              Visualizado por {formatCount(count)}
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(70vh-72px)] overflow-y-auto px-2 py-2">
            {loadingList ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : viewers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Ainda ninguém visualizou.</p>
            ) : (
              viewers.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setOpen(false); navigate(`/profile/${v.id}`); }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-muted/50 transition"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={v.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback>{(v.first_name || v.username || "U")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-[14.5px] font-semibold">
                        {v.full_name || v.first_name || v.username}
                      </span>
                      {v.verified && (
                        <VerificationBadge verified={v.verified} badgeType={v.badge_type} username={v.username}
                          fullName={v.full_name || undefined} className="h-[14px] w-[14px] shrink-0" />
                      )}
                    </span>
                    <span className="text-[12.5px] text-muted-foreground">@{v.username}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
