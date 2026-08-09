import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, Search, Film, MessageCircle, Heart, PlusSquare, 
  Menu, User, LogOut, Settings, Bookmark, Shield, Users, 
  Sun, Moon, Target, X, ChevronLeft, ChevronRight,
  Trophy, TrendingUp, Play, DollarSign, BadgeCheck, CreditCard
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Profile {
  username: string;
  avatar_url: string;
}

export default function YouTubeSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState(0);

  const isDarkMode = settings.theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
    toast.success(newTheme === 'dark' ? 'Modo escuro ativado' : 'Modo claro ativado');
  };

  useEffect(() => {
    loadProfile();
    checkAdminStatus();
    loadOnlineFriends();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const loadOnlineFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("user_presence")
      .select("*", { count: 'exact', head: true })
      .gt("last_seen", fiveMinutesAgo);

    setOnlineFriends(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Desconectado");
    navigate("/auth");
  };

  const mainNavItems = [
    { icon: Home, label: "Início", path: "/feed" },
    { icon: Search, label: "Explorar", path: "/friends" },
    { icon: Film, label: "Vídeos", path: "/videos" },
  ];

  const socialNavItems = [
    { icon: MessageCircle, label: "Mensagens", path: "/messages" },
    { icon: Heart, label: "Notificações", path: "/notifications" },
    { icon: Users, label: "Amigos", path: "/online-friends", badge: onlineFriends > 0 ? onlineFriends : undefined },
  ];

  const ctfNavItems = [
    { icon: Target, label: "CTF Hacking", path: "/ctf-hacking", highlight: true },
    { icon: Trophy, label: "Ranking CTF", path: "/ctf-hacking?tab=leaderboard" },
  ];

  const premiumNavItems = [
    { icon: DollarSign, label: "Monetização", path: "/monetization" },
    { icon: BadgeCheck, label: "Verificação", path: "/verification-checkout" },
  ];

  const creatorNavItems = [
    { icon: PlusSquare, label: "Criar Post", path: "/create" },
    { icon: TrendingUp, label: "Criar Anúncio", path: "/create-ad" },
  ];

  const userNavItems = [
    { icon: Bookmark, label: "Guardados", path: "/saved" },
    { icon: Settings, label: "Configurações", path: "/app-settings" },
  ];

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  const NavItem = ({ icon: Icon, label, path, highlight, badge }: {
    icon: React.ElementType;
    label: string;
    path: string;
    highlight?: boolean;
    badge?: number;
  }) => {
    const active = isActive(path);
    
    const content = (
      <Link
        to={path}
        className={cn(
          "flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
          active
            ? "bg-accent font-semibold"
            : "hover:bg-muted/80",
          highlight && !active && "text-primary hover:bg-primary/10"
        )}
      >
        <div className="relative">
          <Icon className={cn(
            "h-5 w-5 transition-transform group-hover:scale-110",
            active && "text-foreground",
            highlight && "text-primary"
          )} />
          {badge && badge > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        {!collapsed && (
          <span className={cn(
            "text-sm transition-opacity truncate",
            highlight && "text-primary font-medium"
          )}>
            {label}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const SectionTitle = ({ title }: { title: string }) => (
    !collapsed && (
      <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
    )
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-50",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <Link to="/feed" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Play className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Blynk
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-lg"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-1">
            {/* Main Navigation */}
            {mainNavItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}

            <div className="h-px bg-border my-3" />

            {/* Social */}
            <SectionTitle title="Social" />
            {socialNavItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}

            <div className="h-px bg-border my-3" />

            {/* CTF Hacking */}
            <SectionTitle title="CTF Hacking" />
            {ctfNavItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}

            <div className="h-px bg-border my-3" />

            {/* Creator */}
            <SectionTitle title="Criar" />
            {creatorNavItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}

            <div className="h-px bg-border my-3" />

            {/* Premium */}
            <SectionTitle title="Premium" />
            {premiumNavItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}

            <div className="h-px bg-border my-3" />

            {/* User */}
            <SectionTitle title="Você" />
            {userNavItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}

            {/* Admin */}
            {isAdmin && (
              <>
                <div className="h-px bg-border my-3" />
                <SectionTitle title="Admin" />
                <NavItem icon={Shield} label="Painel Admin" path="/admin" />
                <NavItem icon={CreditCard} label="Pagamentos" path="/admin/verification" />
              </>
            )}

            {/* Profile */}
            <div className="h-px bg-border my-3" />
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                isActive("/profile") ? "bg-accent" : "hover:bg-muted/80"
              )}
            >
              <Avatar className="h-6 w-6 ring-2 ring-border">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/20">
                  {profile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {profile?.username || 'Perfil'}
                </span>
              )}
            </Link>
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-2 space-y-1">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="w-full h-10"
                >
                  {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="w-full justify-start gap-3 h-10 px-3"
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
              <span className="text-sm">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </Button>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="w-full h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 h-10 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm">Sair</span>
            </Button>
          )}

          {/* Copyright */}
          {!collapsed && (
            <div className="pt-3 text-center">
              <p className="text-[10px] text-muted-foreground/60">
                © 2026/2027 Blynk
              </p>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
