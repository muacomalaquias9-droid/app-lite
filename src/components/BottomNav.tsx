import { Link, useLocation } from "react-router-dom";
import { Home, Search, MessageCircle, Plus, User, Bell, Film } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNotificationCount } from "@/hooks/useNotificationCount";

export default function BottomNav() {
  const location = useLocation();
  const [profile, setProfile] = useState<{ avatar_url: string | null; id: string } | null>(null);
  const notifCount = useNotificationCount();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url, id").eq("id", user.id).single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const hiddenPaths = ["/auth", "/", "/signup", "/reset-password", "/two-factor-verification", "/blocked"];
  if (hiddenPaths.some(p => location.pathname === p)) return null;
  if (location.pathname.startsWith("/chat/")) return null;

  const items = [
    { to: "/feed", icon: Home, label: "Início" },
    { to: "/friends", icon: Search, label: "Pesquisar" },
    { to: "/reels", icon: Film, label: "Reels" },
    { to: "/messages", icon: MessageCircle, label: "Chat" },
    { to: "/notifications", icon: Bell, label: "Notificações", badge: notifCount },
  ];

  const allItems = [
    items[0],
    items[1],
    items[2],
    { to: "/create", icon: Plus, label: "Criar", isCreate: true } as any,
    items[3],
    items[4],
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-auto mx-3 sm:mx-auto max-w-md h-[62px] flex items-center justify-around px-2 rounded-[28px] border border-border/40 bg-background/55 backdrop-blur-[50px] backdrop-saturate-200 shadow-[0_10px_40px_-10px_hsl(var(--foreground)/0.25)]">
        {allItems.map(({ to, icon: Icon, label, badge, isCreate }: any) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to} aria-label={label}
                className={cn("relative flex items-center justify-center h-11 w-11 rounded-full active:scale-90 transition-all", active && "bg-foreground/10")}>
                {isCreate ? (
                  <span className="h-9 w-9 rounded-[14px] bg-foreground text-background flex items-center justify-center">
                    <Icon className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                ) : (
                  <span className="relative h-[24px] w-[24px]">
                    <Icon className="absolute inset-0 h-full w-full transition-opacity" strokeWidth={0}
                      style={{ fill: 'hsl(var(--foreground) / 0.18)', opacity: active ? 1 : 0 }} />
                    <Icon className="absolute inset-0 h-full w-full" strokeWidth={active ? 2.4 : 1.8}
                      style={{ color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }} />
                  </span>
                )}
                {badge && badge > 0 ? (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </Link>
            );
        })}

        <Link to="/profile" aria-label="Perfil"
          className="flex items-center justify-center h-11 w-11 active:scale-90 transition-transform">
          <Avatar className={cn("h-7 w-7 transition-all", isActive("/profile") && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}>
            <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-muted text-[10px] font-semibold">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </nav>
  );
}
