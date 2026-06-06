import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusSquare, Film, User, Bell } from "lucide-react";
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
    { to: "/create", icon: PlusSquare, label: "Criar" },
    { to: "/notifications", icon: Bell, label: "Notificações", badge: notifCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom bg-background border-t border-border">
      <div className="flex items-center justify-around h-[52px] px-2 max-w-2xl mx-auto">
        {items.map(({ to, icon: Icon, label, badge }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="relative flex items-center justify-center h-12 w-12 active:scale-90 transition-transform"
            >
              <Icon
                className="h-[26px] w-[26px]"
                strokeWidth={active ? 2.2 : 1.6}
                style={{ color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}
              />
              {badge && badge > 0 ? (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        <Link
          to="/profile"
          aria-label="Perfil"
          className="flex items-center justify-center h-12 w-12 active:scale-90 transition-transform"
        >
          <Avatar className={cn(
            "h-[26px] w-[26px] transition-all",
            isActive("/profile") && "ring-[1.5px] ring-foreground ring-offset-1 ring-offset-background"
          )}>
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
