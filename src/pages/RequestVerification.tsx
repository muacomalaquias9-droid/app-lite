import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronLeft, BadgeCheck, Shield, Star, Sparkles, X } from "lucide-react";

// Simple inline badge for this page - replaces VerificationBadge
const VerificationBadge = ({ type = "blue", size = "md" }: { type?: "blue" | "gold"; size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  const color = type === "gold" ? "text-amber-500" : "text-blue-500";
  return <BadgeCheck className={`${sizeClass} ${color}`} />;
};
import { TopBar } from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RequestVerification() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasRequest, setHasRequest] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "plus">("standard");
  const [verifiedUsers, setVerifiedUsers] = useState<any[]>([]);

  useEffect(() => {
    checkExistingRequest();
    loadProfile();
    loadVerifiedUsers();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const loadVerifiedUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, first_name, full_name, avatar_url, verified, badge_type")
      .eq("verified", true)
      .limit(5);

    if (data) setVerifiedUsers(data);
  };

  const checkExistingRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    setHasRequest(!!data);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Por favor, descreva o motivo da solicitação");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        reason: reason.trim(),
        status: "pending",
      });

      if (error) throw error;

      toast.success("Solicitação enviada! Aguarde a análise da equipe.");
      setHasRequest(true);
      setReason("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar solicitação");
    } finally {
      setLoading(false);
    }
  };

  if (profile?.verified) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <TopBar />
          <div className="container max-w-lg mx-auto px-4 py-8 pt-20">
            <Card className="text-center p-8">
              <div className="flex justify-center mb-4">
                <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Conta Verificada!</h2>
              <p className="text-muted-foreground">
                Sua conta já possui verificação ativa
              </p>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
          <div className="flex items-center h-14 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
              className="mr-2"
            >
              {step > 1 ? <ChevronLeft className="h-6 w-6" /> : <X className="h-6 w-6" />}
            </Button>
            <span className="font-semibold">Blynk</span>
          </div>
          {/* Progress Bar */}
          <div className="flex gap-1 px-4 pb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </header>

        <ScrollArea className="h-screen pt-20">
          <div className="container max-w-lg mx-auto px-4 pb-32">
            {/* Step 1: Introduction */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right">
                <div className="text-center pt-8">
                  <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <BadgeCheck className="h-16 w-16 text-blue-500" />
                  </div>
                  <h1 className="text-2xl font-bold mb-3">
                    Mostra a toda a gente que tens a Verificação Blynk
                  </h1>
                  <p className="text-muted-foreground">
                    Os perfis com Verificação Blynk obtêm, em média, mais interações.
                  </p>
                </div>

                {/* Verified Profiles */}
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback>{profile?.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{profile?.full_name || profile?.first_name}</span>
                        <span className="text-muted-foreground">& {profile?.username}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <VerificationBadge type="blue" size="sm" />
                        <span>Blynk associado</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full rounded-full" onClick={() => setStep(2)}>
                    Poupa 20% em 2 perfis
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback>{profile?.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{profile?.full_name || profile?.first_name}</span>
                      <VerificationBadge type="blue" size="sm" />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full rounded-full mt-4" onClick={() => setStep(2)}>
                    Continuar com um perfil
                  </Button>
                </Card>

                <p className="text-sm text-muted-foreground text-center">
                  A Verificação Blynk só está disponível para{" "}
                  <span className="text-primary">alguns perfis</span>. A tua foto de perfil e o teu nome vão ser sincronizados durante a verificação.{" "}
                  <span className="text-primary">Saber mais</span>
                </p>
              </div>
            )}

            {/* Step 2: Select Plan */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right">
                <div className="text-center pt-4">
                  <Avatar className="h-20 w-20 mx-auto mb-4 ring-4 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-2xl">{profile?.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl font-bold">{profile?.full_name || profile?.first_name}</span>
                    <VerificationBadge type="blue" size="md" />
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <div className="flex -space-x-2">
                      {verifiedUsers.slice(0, 3).map((u, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback>{u.first_name?.[0]}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {verifiedUsers.length} perfis que segues já têm um distintivo de verificação.
                    </span>
                  </div>
                </div>

                {/* Plans */}
                <div className="flex gap-3">
                  {/* Standard Plan */}
                  <Card 
                    className={`flex-1 p-4 cursor-pointer transition-all ${selectedPlan === "standard" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedPlan("standard")}
                  >
                    <h3 className="font-bold text-lg mb-1">Standard</h3>
                    <p className="text-primary font-semibold">0,59 US$ pelo teu primeiro mês</p>
                    <p className="text-sm text-muted-foreground line-through">8,79 US$/mês por perfil</p>
                    <span className="inline-block px-2 py-1 bg-muted rounded text-xs mt-2">Recomendado</span>
                    
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-5 w-5 text-primary" />
                        <span className="text-sm">Distintivo de verificação</span>
                      </div>
                      <p className="font-medium text-sm">Promover a interação</p>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">Adiciona imagens às tuas ligações</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">Stickers exclusivos</span>
                      </div>
                      <p className="font-medium text-sm">Protege a tua marca</p>
                    </div>
                  </Card>

                  {/* Plus Plan */}
                  <Card 
                    className={`flex-1 p-4 cursor-pointer transition-all ${selectedPlan === "plus" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedPlan("plus")}
                  >
                    <h3 className="font-bold text-lg mb-1">Plus</h3>
                    <p className="text-primary font-semibold">1,39 US$ pelo teu primeiro mês</p>
                    <p className="text-sm text-muted-foreground line-through">21,49 US$/mês por perfil</p>
                    
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-5 w-5 text-amber-500" />
                        <span className="text-sm">Badge Dourado</span>
                      </div>
                      <p className="font-medium text-sm">Maximizar a interação</p>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">Todas as funcionalidades Standard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">Suporte prioritário</span>
                      </div>
                    </div>
                  </Card>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  A Verificação Blynk está disponível para pessoas com mais de 18 anos.
                </p>

                <Button 
                  className="w-full h-12 rounded-full text-lg"
                  onClick={() => setStep(3)}
                >
                  Desbloquear benefícios
                </Button>
              </div>
            )}

            {/* Step 3: Profile Preview */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right">
                <div className="text-center pt-4">
                  <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-3xl">{profile?.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold">{profile?.full_name || profile?.first_name}</span>
                    <VerificationBadge type={selectedPlan === "plus" ? "gold" : "blue"} size="lg" />
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Verificação Blynk {selectedPlan === "plus" ? "Plus" : "Standard"}
                  </p>
                </div>

                <Card className="p-6">
                  <h3 className="font-bold text-lg mb-2">
                    <span className="line-through text-muted-foreground mr-2">
                      {selectedPlan === "plus" ? "21,49 US$" : "8,79 US$"}
                    </span>
                    <span className="text-primary">
                      {selectedPlan === "plus" ? "1,39 US$" : "0,59 US$"} no primeiro mês
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Depois, {selectedPlan === "plus" ? "21,49 US$" : "8,79 US$"} por mês até cancelares. O preço pode incluir impostos aplicáveis.
                  </p>
                  <div className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                    Oferta de boas-vindas de {selectedPlan === "plus" ? "1,39 US$" : "0,59 US$"} aplicada
                  </div>
                </Card>

                <div className="space-y-4">
                  <h3 className="font-bold text-lg">As vantagens da tua subscrição</h3>
                  {[
                    "Distintivo de verificação",
                    "Maior proteção da conta",
                    "Assistência melhorada",
                    "Funcionalidades exclusivas",
                    "Acesso antecipado a novidades"
                  ].map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Ao continuares, concordas que os <span className="text-primary">Termos de Serviço</span> se aplicam à tua subscrição da Verificação Blynk. Vais inscrever-te na <span className="text-primary">Proteção Avançada</span>. Cancela 24 horas antes da tua próxima data de pagamento para evitar cobranças.{" "}
                  <span className="text-primary">Saber mais</span>
                </p>

                <Button 
                  className="w-full h-12 rounded-full text-lg"
                  onClick={() => setStep(4)}
                >
                  Continuar
                </Button>
              </div>
            )}

            {/* Step 4: Reason */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right">
                <div className="text-center pt-4">
                  <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">
                    Conta-nos sobre ti
                  </h1>
                  <p className="text-muted-foreground">
                    Explica por que mereces a verificação
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Motivo da Solicitação *
                  </label>
                  <Textarea
                    placeholder="Descreva por que você merece o selo de verificação. Inclua informações sobre sua atividade, influência ou autenticidade..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-40"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {reason.length}/500 caracteres
                  </p>
                </div>

                <Button 
                  className="w-full h-12 rounded-full text-lg"
                  onClick={() => setStep(5)}
                  disabled={!reason.trim()}
                >
                  Continuar
                </Button>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right">
                <div className="text-center pt-8">
                  <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-12 w-12 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">
                    Confirmar solicitação
                  </h1>
                  <p className="text-muted-foreground">
                    Revise os detalhes antes de enviar
                  </p>
                </div>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback>{profile?.first_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{profile?.full_name || profile?.first_name}</span>
                        <VerificationBadge type={selectedPlan === "plus" ? "gold" : "blue"} size="sm" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Plano {selectedPlan === "plus" ? "Plus" : "Standard"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Motivo:</p>
                    <p className="text-sm">{reason}</p>
                  </div>
                </Card>

                {hasRequest ? (
                  <div className="text-center py-4">
                    <Check className="h-12 w-12 text-primary mx-auto mb-2" />
                    <p className="font-semibold">Solicitação já enviada!</p>
                    <p className="text-sm text-muted-foreground">Aguarde a análise da equipe.</p>
                  </div>
                ) : (
                  <Button 
                    className="w-full h-12 rounded-full text-lg"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Enviando..." : "Enviar Solicitação"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </ProtectedRoute>
  );
}
