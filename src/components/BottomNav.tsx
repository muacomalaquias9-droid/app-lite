import { Link, useLocation } from "react-router-dom";
import { Home, Search, MessageCircle, Plus, User, Bell } from "lucide-react";
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
    { to: "/videos", icon: Search, label: "Explorar" },
    { to: "/messages", icon: MessageCircle, label: "Chat" },
    { to: "/notifications", icon: Bell, label: "Notificações", badge: notifCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom pointer-events-none">
      <div className="relative mx-auto max-w-md px-4 pb-3 pointer-events-auto">
        {/* Floating round + button (centered, raised) */}
        <Link
          to="/create"
          aria-label="Criar"
          className="absolute left-1/2 -translate-x-1/2 -top-6 z-10 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(37,99,235,0.7)] active:scale-90 transition-transform ring-4 ring-background"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </Link>

        {/* Liquid glass pill */}
        <div
          className="relative h-[60px] rounded-[28px] flex items-center justify-around px-3 bg-white/70 dark:bg-white/10 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18)]"
          style={{ backdropFilter: 'blur(50px) saturate(200%)', WebkitBackdropFilter: 'blur(50px) saturate(200%)' }}
        >
          {/* Glossy top highlight */}
          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

          {items.slice(0, 2).map(({ to, icon: Icon, label, badge }) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to} aria-label={label}
                className="relative flex items-center justify-center h-11 w-11 rounded-full active:scale-90 transition-transform">
                <Icon className="h-[24px] w-[24px]" strokeWidth={active ? 2.4 : 1.7}
                  style={{ color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }} />
                {badge && badge > 0 ? (
                  <span className="absolute top-1 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          {/* Spacer for floating + */}
          <div className="w-14" />

          {items.slice(2).map(({ to, icon: Icon, label, badge }) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to} aria-label={label}
                className="relative flex items-center justify-center h-11 w-11 rounded-full active:scale-90 transition-transform">
                <Icon className="h-[24px] w-[24px]" strokeWidth={active ? 2.4 : 1.7}
                  style={{ color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }} />
                {badge && badge > 0 ? (
                  <span className="absolute top-1 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          {/* Profile avatar (with ring) */}
          <Link to="/profile" aria-label="Perfil"
            className="flex items-center justify-center h-11 w-11 active:scale-90 transition-transform">
            <Avatar className={cn(
              "h-8 w-8 transition-all ring-[1.5px] ring-blue-500/40",
              isActive("/profile") && "ring-blue-600 ring-2"
            )}>
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-muted text-[10px] font-semibold">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </nav>
  );
}
