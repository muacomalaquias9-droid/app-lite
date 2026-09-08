import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Lock, Loader2, Camera, IdCard, CheckCircle2, XCircle, ArrowLeft, LogOut,
} from "lucide-react";
import { toast } from "sonner";

type Step = "blocked" | "review" | "result";

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function Blocked() {
  const [profile, setProfile] = useState<any>(null);
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [step, setStep] = useState<Step>("blocked");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ approved: boolean; reason: string } | null>(null);

  const selfieInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profileData }, { data: blockData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("blocked_accounts").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(profileData);
      setBlockInfo(blockData);
      setEmail(user.email || "");
    };
    load();
  }, []);

  const pick = async (file: File | undefined, kind: "selfie" | "document") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Envia uma imagem.");
    if (file.size > 8 * 1024 * 1024) return toast.error("A imagem é muito grande (máx. 8 MB).");
    const preview = URL.createObjectURL(file);
    if (kind === "selfie") { setSelfie(file); setSelfiePreview(preview); }
    else { setDocument(file); setDocumentPreview(preview); }
  };

  const handleSubmit = async () => {
    if (!email || !password || !selfie || !document) {
      toast.error("Preenche o email, a senha e envia o documento e a foto do rosto.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada.");

      const stamp = Date.now();
      const selfiePath = `${user.id}/appeal-selfie-${stamp}.jpg`;
      const documentPath = `${user.id}/appeal-doc-${stamp}.jpg`;

      await Promise.all([
        supabase.storage.from("identity-docs").upload(selfiePath, selfie, { upsert: true }),
        supabase.storage.from("identity-docs").upload(documentPath, document, { upsert: true }),
      ]);

      const [selfieData, docData] = await Promise.all([fileToDataUrl(selfie), fileToDataUrl(document)]);

      const { data, error } = await supabase.functions.invoke("account-appeal", {
        body: { email, password, selfie: selfieData, document: docData, selfiePath, documentPath },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || "Não foi possível concluir a revisão.");

      setResult({ approved: !!data.approved, reason: data.reason || "" });
      setStep("result");
      setPassword("");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao pedir revisão.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = profile?.full_name || profile?.first_name || profile?.username || "A tua conta";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
      <AnimatePresence mode="wait">
        {step === "blocked" && (
          <motion.div
            key="blocked"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="w-full max-w-sm flex flex-col items-center text-center"
          >
            <Avatar className="h-28 w-28 ring-4 ring-border">
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-3xl font-bold bg-muted">{displayName[0]}</AvatarFallback>
            </Avatar>

            <h1 className="mt-5 text-[22px] font-bold">{displayName}</h1>
            {profile?.username && <p className="text-[14px] text-muted-foreground">@{profile.username}</p>}

            <div className="mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ShieldAlert className="h-7 w-7 text-foreground/70" />
            </div>
            <h2 className="mt-4 text-[19px] font-bold">A tua conta está bloqueada</h2>
            <p className="mt-2 text-[14px] text-muted-foreground max-w-[300px]">
              {blockInfo?.reason || "A tua conta foi bloqueada por violar as diretrizes da comunidade."}
            </p>

            <Button
              onClick={() => setStep("review")}
              className="mt-8 h-12 w-full rounded-xl text-[15px] font-semibold"
            >
              <Lock className="mr-2 h-4 w-4" />
              Desbloquear conta
            </Button>

            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              className="mt-4 flex items-center gap-2 text-[14px] text-muted-foreground"
            >
              <LogOut className="h-4 w-4" /> Terminar sessão
            </button>
          </motion.div>
        )}

        {step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="w-full max-w-sm"
          >
            <button onClick={() => setStep("blocked")} className="mb-4 flex items-center gap-2 text-[14px] text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            <h1 className="text-[22px] font-bold">Pedir revisão</h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              A inteligência artificial confirma a tua identidade. O documento tem de ser teu e o
              rosto da foto tem de ser igual ao do bilhete.
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[14px]">Email da conta</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[14px]">Senha da conta</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 text-base" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => docInput.current?.click()}
                  className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/30"
                >
                  {documentPreview ? (
                    <img src={documentPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <>
                      <IdCard className="h-6 w-6 text-muted-foreground" />
                      <span className="text-[12.5px] font-medium text-muted-foreground">Bilhete de identidade</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => selfieInput.current?.click()}
                  className="relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/30"
                >
                  {selfiePreview ? (
                    <img src={selfiePreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <>
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-[12.5px] font-medium text-muted-foreground">Foto do rosto</span>
                    </>
                  )}
                </button>
              </div>

              <input ref={docInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0], "document")} />
              <input ref={selfieInput} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => pick(e.target.files?.[0], "selfie")} />

              <Button onClick={handleSubmit} disabled={submitting} className="h-12 w-full rounded-xl text-[15px] font-semibold">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar para revisão"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm flex flex-col items-center text-center"
          >
            {result.approved ? (
              <CheckCircle2 className="h-16 w-16 text-foreground" />
            ) : (
              <XCircle className="h-16 w-16 text-destructive" />
            )}
            <h1 className="mt-5 text-[21px] font-bold">
              {result.approved ? "Conta desbloqueada" : "Revisão recusada"}
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">{result.reason}</p>

            {result.approved ? (
              <Button onClick={() => (window.location.href = "/feed")} className="mt-8 h-12 w-full rounded-xl font-semibold">
                Voltar à rede social
              </Button>
            ) : (
              <Button onClick={() => setStep("review")} variant="outline" className="mt-8 h-12 w-full rounded-xl font-semibold">
                Tentar novamente
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
