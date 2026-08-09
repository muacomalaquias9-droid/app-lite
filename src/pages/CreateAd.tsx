import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft, Upload, Link as LinkIcon, Image, Building2, FileText, Sparkles, CheckCircle2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CreateAd() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    company_name: "",
    content: "",
    link_url: "",
    link_title: "",
    link_description: "",
  });
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [linkImage, setLinkImage] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>("");
  const [linkImagePreview, setLinkImagePreview] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'link') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'logo') {
      setCompanyLogo(file);
      setCompanyLogoPreview(URL.createObjectURL(file));
    } else {
      setLinkImage(file);
      setLinkImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('ads')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('ads')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyLogo) {
      toast.error("Adicione o logo da empresa");
      return;
    }

    setLoading(true);

    try {
      // Upload company logo
      const logoUrl = await uploadImage(companyLogo, 'company-logos');

      // Upload link image if provided
      let linkImageUrl = null;
      if (linkImage) {
        linkImageUrl = await uploadImage(linkImage, 'ad-images');
      }

      // Insert ad
      const { error } = await supabase.from("sponsored_ads").insert({
        company_name: formData.company_name,
        company_logo: logoUrl,
        content: formData.content,
        link_url: formData.link_url,
        link_title: formData.link_title || null,
        link_description: formData.link_description || null,
        link_image: linkImageUrl,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Anúncio criado com sucesso! Aguarde aprovação.");
      navigate("/feed");
    } catch (error: any) {
      console.error("Erro ao criar anúncio:", error);
      toast.error("Erro ao criar anúncio");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Empresa', icon: Building2 },
    { id: 2, title: 'Conteúdo', icon: FileText },
    { id: 3, title: 'Link', icon: LinkIcon },
  ];

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.company_name.trim() && companyLogo;
      case 2:
        return formData.content.trim();
      case 3:
        return formData.link_url.trim();
      default:
        return false;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
        <TopBar />
        
        <div className="max-w-2xl mx-auto p-4 pt-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Criar Anúncio
              </h1>
              <p className="text-sm text-muted-foreground">Promova sua empresa no Blynk</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 px-4">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                  step >= s.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {step > s.id ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "w-20 h-1 mx-2 rounded transition-all",
                    step > s.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {step === 1 && <><Building2 className="h-5 w-5 text-primary" /> Informações da Empresa</>}
                    {step === 2 && <><FileText className="h-5 w-5 text-primary" /> Conteúdo do Anúncio</>}
                    {step === 3 && <><LinkIcon className="h-5 w-5 text-primary" /> Link de Destino</>}
                  </CardTitle>
                  <CardDescription>
                    {step === 1 && "Nome e logo da sua empresa"}
                    {step === 2 && "Texto que aparecerá no anúncio"}
                    {step === 3 && "Link para onde os usuários serão direcionados"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Company Info */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="company_name">Nome da Empresa *</Label>
                          <Input
                            id="company_name"
                            value={formData.company_name}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                            placeholder="Ex: Blynk Technologies"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label>Logo da Empresa *</Label>
                          <div className="mt-2 flex flex-col items-center gap-4 p-6 border-2 border-dashed border-border rounded-xl bg-muted/30">
                            {companyLogoPreview ? (
                              <img 
                                src={companyLogoPreview} 
                                alt="Logo preview" 
                                className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20" 
                              />
                            ) : (
                              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                                <Building2 className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}
                            <label htmlFor="company_logo" className="cursor-pointer">
                              <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                                <Upload className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {companyLogoPreview ? 'Trocar Logo' : 'Carregar Logo'}
                                </span>
                              </div>
                              <input
                                id="company_logo"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'logo')}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Content */}
                    {step === 2 && (
                      <div>
                        <Label htmlFor="content">Texto do Anúncio *</Label>
                        <Textarea
                          id="content"
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          placeholder="Escreva uma mensagem atraente para seu público..."
                          rows={5}
                          className="mt-1.5 resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {formData.content.length}/500 caracteres
                        </p>
                      </div>
                    )}

                    {/* Step 3: Link */}
                    {step === 3 && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="link_url">URL do Link *</Label>
                          <Input
                            id="link_url"
                            type="url"
                            value={formData.link_url}
                            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                            placeholder="https://seusite.com"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="link_title">Título do Link</Label>
                          <Input
                            id="link_title"
                            value={formData.link_title}
                            onChange={(e) => setFormData({ ...formData, link_title: e.target.value })}
                            placeholder="Título que aparece no preview"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="link_description">Descrição</Label>
                          <Textarea
                            id="link_description"
                            value={formData.link_description}
                            onChange={(e) => setFormData({ ...formData, link_description: e.target.value })}
                            placeholder="Breve descrição do link"
                            rows={2}
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label>Imagem de Preview</Label>
                          <div className="mt-2 border-2 border-dashed border-border rounded-xl overflow-hidden">
                            {linkImagePreview ? (
                              <img 
                                src={linkImagePreview} 
                                alt="Link preview" 
                                className="w-full h-48 object-cover" 
                              />
                            ) : (
                              <div className="h-48 bg-muted/30 flex flex-col items-center justify-center">
                                <Image className="h-10 w-10 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground">Nenhuma imagem</span>
                              </div>
                            )}
                            <label htmlFor="link_image" className="cursor-pointer block p-3 bg-muted/50 hover:bg-muted transition-colors">
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <Upload className="h-4 w-4" />
                                <span>{linkImagePreview ? 'Trocar Imagem' : 'Adicionar Imagem'}</span>
                              </div>
                              <input
                                id="link_image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'link')}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 pt-4">
                      {step > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(step - 1)}
                          className="flex-1"
                        >
                          Voltar
                        </Button>
                      )}
                      
                      {step < 3 ? (
                        <Button
                          type="button"
                          onClick={() => setStep(step + 1)}
                          disabled={!canProceed()}
                          className="flex-1"
                        >
                          Continuar
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={loading || !canProceed()}
                          className="flex-1"
                        >
                          {loading ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Criando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Publicar Anúncio
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </ProtectedRoute>
  );
}
