import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Upload, Mail, KeyRound, FileText } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { toast } from "sonner";

export default function Blocked() {
  const [profile, setProfile] = useState<any>(null);
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [documents, setDocuments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBlockedUserInfo();
  }, []);

  const loadBlockedUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: blockData } = await supabase
        .from('blocked_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);
      setBlockInfo(blockData);
    }
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Aqui você pode implementar a lógica de recuperação
      // Por exemplo, enviar um email para o suporte
      
      toast.success("Solicitação de recuperação enviada! Nossa equipe analisará seu caso.");
    } catch (error) {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-background to-red-50 dark:from-red-950/20 dark:via-background dark:to-red-950/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-red-200 dark:border-red-900">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">
            Sua conta está bloqueada
          </CardTitle>
          <CardDescription className="text-base">
            Sua conta foi bloqueada por violar as diretrizes da comunidade Blynk
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {profile && (
            <div className="flex flex-col items-center gap-4 p-6 bg-accent/30 rounded-lg border border-border/50">
              <ProfileAvatar 
                userId={profile.id}
                avatarUrl={profile.avatar_url}
                username={profile.username}
                size="xl"
              />
              <div className="text-center">
                <h3 className="font-bold text-xl">{profile.first_name}</h3>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                {blockInfo && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    Motivo: {blockInfo.reason || "Violação das diretrizes"}
                  </p>
                )}
              </div>
            </div>
          )}

          <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <AlertDescription className="text-sm">
              Para recuperar sua conta, você precisa confirmar sua identidade enviando os documentos solicitados abaixo.
              Se não conseguir recuperar, sua conta ficará desativada permanentemente.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleRecoveryRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail da Conta
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Senha Original
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos de Identificação
              </Label>
              <Textarea
                id="documents"
                placeholder="Descreva os documentos que você pode fornecer (RG, CPF, CNH, etc.) ou cole links para os arquivos"
                value={documents}
                onChange={(e) => setDocuments(e.target.value)}
                required
                className="min-h-[100px] border-border/50"
              />
              <p className="text-xs text-muted-foreground">
                Você também pode enviar documentos por e-mail para suporte@blynk.com
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={submitting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {submitting ? "Enviando..." : "Solicitar Recuperação de Conta"}
            </Button>
          </form>

          <div className="pt-4 border-t text-center text-sm text-muted-foreground">
            <p>Tem dúvidas? Entre em contato com nosso suporte:</p>
            <a 
              href="mailto:suporte@blynk.com" 
              className="text-primary hover:underline font-medium"
            >
              suporte@blynk.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
