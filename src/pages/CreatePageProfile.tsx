import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CreatePageProfile() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Por favor, insira um nome para o perfil");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let avatarUrl = null;

      // Upload da foto se houver
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("page-avatars")
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("page-avatars")
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // Gerar email único para a conta
      const pageEmail = `${name.toLowerCase().replace(/\s+/g, '')}+${user.id.substring(0, 8)}@blynk.page`;

      // Criar o perfil de página
      const { error } = await supabase
        .from("page_profiles")
        .insert({
          user_id: user.id,
          name: name.trim(),
          avatar_url: avatarUrl,
          page_type: "page",
          is_authenticated: true,
          email: pageEmail
        });

      if (error) throw error;

      toast.success(`Perfil "${name}" criado com sucesso!`);
      navigate("/profile");
    } catch (error: any) {
      console.error("Error creating page profile:", error);
      toast.error(error.message || "Erro ao criar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-xl mx-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Adiciona um nome e uma foto de perfil
            </h1>
            <p className="text-muted-foreground">
              Dá asas à criatividade e adiciona um nome e uma foto de perfil. Podes editá-los mais tarde.
            </p>
          </div>

          {/* Avatar Upload */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-muted text-4xl">
                  {name.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-muted hover:bg-muted/80 rounded-full p-3 cursor-pointer border-4 border-background"
              >
                <Camera className="h-5 w-5" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Input
              placeholder="Nome do perfil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg"
              maxLength={50}
            />
            <p className="text-sm text-muted-foreground">
              Este é o teu nome de apresentação quando publicas, comentas ou fazes algo com este perfil.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full h-12 text-base font-semibold"
          >
            {loading ? "Criando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
