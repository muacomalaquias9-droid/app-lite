import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PageProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  page_type: string;
}

interface Profile {
  id: string;
  first_name: string;
  avatar_url: string | null;
  verified: boolean;
  badge_type: string | null;
}

export default function ProfileSwitcher() {
  const navigate = useNavigate();
  const { activeProfile, setActiveProfile } = useActiveProfile();
  const [mainProfile, setMainProfile] = useState<Profile | null>(null);
  const [pageProfiles, setPageProfiles] = useState<PageProfile[]>([]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar perfil principal
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setMainProfile(profile);
      }

      // Buscar perfis de páginas
      const { data: pages } = await supabase
        .from("page_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (pages) setPageProfiles(pages);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const handleSelectProfile = (profileId: string, isPage: boolean, name: string, avatar: string | null) => {
    if (isPage) {
      setActiveProfile({
        id: profileId,
        name: name,
        type: 'page',
        avatar_url: avatar,
      });
    } else {
      setActiveProfile({
        id: profileId,
        name: name,
        type: 'user',
        avatar_url: avatar,
      });
    }
  };

  const getCurrentProfile = () => {
    if (!activeProfile) {
      return {
        name: mainProfile?.first_name || "",
        avatar: mainProfile?.avatar_url || null,
        verified: mainProfile?.verified || false,
        badge_type: mainProfile?.badge_type || null
      };
    }
    
    if (activeProfile.type === 'user') {
      return {
        name: mainProfile?.first_name || activeProfile.name,
        avatar: mainProfile?.avatar_url || activeProfile.avatar_url,
        verified: mainProfile?.verified || false,
        badge_type: mainProfile?.badge_type || null
      };
    }
    
    return {
      name: activeProfile.name,
      avatar: activeProfile.avatar_url,
      verified: false,
      badge_type: null
    };
  };

  const current = getCurrentProfile();

  return (
    <Sheet>
      <SheetTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className="font-semibold text-foreground text-lg">
          {current.name}
        </span>
        {current.verified && (
          <Badge variant="default" className="h-5 w-5 p-0 rounded-full">
            ✓
          </Badge>
        )}
        <ChevronDown className="h-5 w-5 text-foreground" />
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[70vh] max-h-[600px] rounded-t-3xl p-0 border-t-2">
        {/* Handle para arrastar */}
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
        
        <SheetHeader className="px-6 pb-2 pt-0">
          <SheetTitle className="text-2xl font-bold text-left">
            Perfis
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-4rem)] px-4">
          {/* Perfil Principal */}
          {mainProfile && (
            <div
              onClick={() => handleSelectProfile(mainProfile.id, false, mainProfile.first_name, mainProfile.avatar_url)}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 rounded-2xl cursor-pointer transition-colors mb-3"
            >
              <Avatar className="h-16 w-16 border-2 border-border">
                <AvatarImage src={mainProfile.avatar_url || ""} />
                <AvatarFallback className="text-xl">
                  {mainProfile.first_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg truncate">
                  {mainProfile.first_name}
                </div>
              </div>
              {activeProfile?.id === mainProfile.id && activeProfile?.type === 'user' && (
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          )}

          {/* Páginas Criadas */}
          {pageProfiles.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground px-4 mb-3">
                  Os teus perfis do Blynk
                </h3>
                {pageProfiles.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => handleSelectProfile(page.id, true, page.name, page.avatar_url)}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 rounded-2xl cursor-pointer transition-colors mb-2"
                  >
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={page.avatar_url || ""} />
                      <AvatarFallback className="text-xl">
                        {page.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg truncate">
                        {page.name}
                      </div>
                    </div>
                    {activeProfile?.id === page.id && activeProfile?.type === 'page' && (
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <Separator className="my-4" />

          {/* Criar Novo Perfil */}
          <div
            onClick={() => navigate("/create-page-profile")}
            className="flex items-center gap-4 p-4 hover:bg-muted/50 rounded-2xl cursor-pointer transition-colors mb-3"
          >
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-7 w-7" />
            </div>
            <span className="font-semibold text-lg">Criar perfil do Blynk</span>
          </div>

          <Separator className="my-4" />

          {/* Centro de Contas */}
          <div
            onClick={() => navigate("/settings")}
            className="p-4 hover:bg-muted/50 rounded-2xl cursor-pointer text-center transition-colors mb-4"
          >
            <span className="font-semibold text-base">Ir para o Centro de Contas</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
