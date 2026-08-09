import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, MessageSquare, Plus, Video, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import SideMenu from "./SideMenu";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/feed", label: "Feed", icon: Home },
    { path: "/friends", label: "Amigos", icon: Users },
    { path: "/create", label: "Criar", icon: Plus },
    { path: "/videos", label: "Vídeos", icon: Video },
    { path: "/messages", label: "Mensagens", icon: MessageSquare },
  ];

  return (
    // Header com logo, pesquisa e menu - Estilo Blynk
    <div className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SideMenu />
            <Link to="/feed" className="flex items-center flex-shrink-0 hover:opacity-80 transition-opacity">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Blynk
              </span>
            </Link>
          </div>

          {/* Barra de pesquisa - Estilo Blynk */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Pesquisar no Blynk"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary rounded-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 bg-secondary hover:bg-secondary/80"
              onClick={() => navigate("/create")}
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 bg-secondary hover:bg-secondary/80 sm:hidden"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}