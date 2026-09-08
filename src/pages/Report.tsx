import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const reportCategories = [
  { id: 'fraud', label: 'Fraude ou burla' },
  { id: 'harassment', label: 'Assédio ou falta de respeito' },
  { id: 'hate', label: 'Discurso de ódio ou ameaças' },
  { id: 'impersonation', label: 'Conta falsa ou personificação' },
  { id: 'violence', label: 'Violência ou organizações perigosas' },
  { id: 'nudity', label: 'Nudez ou atividade sexual' },
  { id: 'sale', label: 'Venda ou promoção de artigos restritos' },
  { id: 'other', label: 'Outro' },
];

export default function Report() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const contentType = (params.get('type') || 'post') as 'post' | 'user' | 'comment';
  const contentId = params.get('id') || '';

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmitReport = async () => {
    if (!selectedCategory || !contentId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('report-review', {
        body: { contentType, contentId, category: selectedCategory, details },
      });
      if (error) throw error;

      if (data?.blocked) {
        toast.success('Denúncia analisada: a conta foi bloqueada por violar as diretrizes.');
      } else {
        toast.success('Denúncia enviada. A análise automática já foi feita.');
      }
      navigate(-1);
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível enviar a denúncia.');
    } finally {
      setSending(false);
    }
  };

  if (selectedCategory) {
    const category = reportCategories.find((c) => c.id === selectedCategory);

    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b border-border px-2 py-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <h1 className="text-2xl font-bold">{category?.label}</h1>

          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
            <ShieldAlert className="h-5 w-5 shrink-0 text-foreground/70" />
            <p className="text-sm text-muted-foreground">
              A análise é feita automaticamente pela inteligência artificial. Se confirmar burla ou
              falta de respeito, a conta denunciada é bloqueada imediatamente. Não informamos quem
              denunciou.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Conta o que aconteceu (opcional)</p>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Descreve o que esta conta fez..."
              className="min-h-[120px] text-base"
            />
          </div>

          <Button onClick={handleSubmitReport} disabled={sending} className="w-full h-12 rounded-xl text-base font-semibold">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar denúncia'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-2 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-2">Seleciona um problema para denunciar</h1>
          <p className="text-sm text-muted-foreground">
            Não vamos informar a pessoa sobre quem a denunciou. Se alguém estiver em perigo iminente,
            liga para os serviços de emergência locais.
          </p>
        </div>

        <div>
          {reportCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-accent transition-colors border-b border-border text-left"
            >
              <span className="text-[15px]">{category.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
