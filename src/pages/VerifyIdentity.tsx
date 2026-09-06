import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ScanFace, IdCard, Loader2, ShieldCheck, ShieldAlert, Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import VerificationBadge from '@/components/VerificationBadge';

type Verdict = { approved: boolean; reason: string; age?: number | null; face_match_score?: number | null } | null;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function VerifyIdentity() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const selfieInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const [selfie, setSelfie] = useState<{ file: File; url: string } | null>(null);
  const [doc, setDoc] = useState<{ file: File; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>(null);

  const pick = async (file: File | undefined, kind: 'selfie' | 'doc') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Escolhe uma imagem'); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error('Imagem demasiado grande (máx. 12MB)'); return; }
    const url = await readAsDataUrl(file);
    if (kind === 'selfie') setSelfie({ file, url });
    else setDoc({ file, url });
    setVerdict(null);
  };

  const upload = async (file: File, kind: string) => {
    if (!user) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('identity-docs').upload(path, file, { upsert: true });
    if (error) { console.error(error); return null; }
    return path;
  };

  const submit = async () => {
    if (!selfie || !doc) { toast.error('Envia o rosto e o documento'); return; }
    setLoading(true);
    setVerdict(null);
    try {
      const [selfiePath, documentPath] = await Promise.all([
        upload(selfie.file, 'selfie'),
        upload(doc.file, 'documento'),
      ]);

      const { data, error } = await supabase.functions.invoke('verify-identity', {
        body: { selfie: selfie.url, document: doc.url, selfiePath, documentPath },
      });

      if (error) {
        const msg = (data as any)?.message || 'Não foi possível verificar agora. Tenta novamente.';
        toast.error(msg);
        return;
      }

      setVerdict(data as Verdict);
      if ((data as any)?.approved) toast.success('Selo de verificação aprovado!');
      else toast.error('Verificação recusada');
    } catch (e: any) {
      toast.error(e?.message || 'Erro na verificação');
    } finally {
      setLoading(false);
    }
  };

  const Slot = ({
    label, hint, icon: Icon, value, onPick, capture,
  }: any) => (
    <button
      type="button"
      onClick={onPick}
      className="w-full flex items-center gap-3 p-3 rounded-3xl border border-border/60 bg-muted/20 text-left active:scale-[0.98] transition"
    >
      <div className="h-[72px] w-[72px] rounded-2xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {value ? (
          <img src={value.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-7 w-7 text-muted-foreground" strokeWidth={1.6} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold">{label}</p>
        <p className="text-[12.5px] text-muted-foreground leading-snug">{hint}</p>
      </div>
      <span className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
        {capture ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <header className="flex items-center gap-2 h-14 px-2 border-b border-border/60 safe-area-top shrink-0">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-bold flex-1">Obter selo</h1>
      </header>

      <div className="flex-1 overflow-y-auto native-scroll pb-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex flex-col items-center text-center py-7 gap-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <VerificationBadge verified badgeType="blue" size="lg" clickable={false} />
            </motion.div>
            <h2 className="text-[20px] font-extrabold tracking-tight">Verificação de identidade</h2>
            <p className="text-[13.5px] text-muted-foreground max-w-[300px]">
              Confirmamos o teu rosto com o teu documento por inteligência artificial. Só tu vês estas fotos.
            </p>
          </div>

          <div className="space-y-3">
            <Slot
              label="Foto do rosto"
              hint="Tira uma selfie com boa luz, sem óculos escuros nem chapéu."
              icon={ScanFace}
              value={selfie}
              capture
              onPick={() => selfieInput.current?.click()}
            />
            <Slot
              label="Bilhete de identidade"
              hint="Documento válido, dentro do prazo e com a foto bem visível."
              icon={IdCard}
              value={doc}
              onPick={() => docInput.current?.click()}
            />
          </div>

          <input ref={selfieInput} type="file" accept="image/*" capture="user" className="hidden"
            onChange={(e) => pick(e.target.files?.[0], 'selfie')} />
          <input ref={docInput} type="file" accept="image/*" className="hidden"
            onChange={(e) => pick(e.target.files?.[0], 'doc')} />

          <ul className="mt-5 space-y-2 text-[12.5px] text-muted-foreground">
            <li>• O rosto tem de ser igual ao do documento.</li>
            <li>• O documento não pode estar expirado.</li>
            <li>• Só contas com 13 anos ou mais podem receber o selo.</li>
            <li>• Documentos ou rostos falsos são recusados automaticamente.</li>
          </ul>

          <AnimatePresence>
            {verdict && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-5 p-4 rounded-3xl border ${
                  verdict.approved ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {verdict.approved
                    ? <ShieldCheck className="h-5 w-5 text-primary" />
                    : <ShieldAlert className="h-5 w-5 text-destructive" />}
                  <p className="text-[15px] font-bold">
                    {verdict.approved ? 'Identidade confirmada' : 'Verificação recusada'}
                  </p>
                </div>
                <p className="text-[13.5px] text-muted-foreground">{verdict.reason}</p>
                {verdict.approved && (
                  <button onClick={() => navigate('/profile')}
                    className="mt-3 h-11 w-full rounded-full bg-foreground text-background font-semibold text-[15px]">
                    Ver o meu perfil
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={submit}
            disabled={loading || !selfie || !doc}
            className="mt-6 h-12 w-full rounded-full bg-primary text-primary-foreground font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition"
          >
            {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> A analisar...</>) : 'Verificar identidade'}
          </button>
        </div>
      </div>
    </div>
  );
}
