import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '@/assets/blynk-logo.jpg';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthFirstNameProps {
  onNext: (firstName: string) => void;
  onBack?: () => void;
}

export const AuthFirstName = ({ onNext, onBack }: AuthFirstNameProps) => {
  const [firstName, setFirstName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = firstName.trim();
    if (!trimmedName) return;

    // Check if first name already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('first_name')
      .ilike('first_name', trimmedName)
      .single();

    if (existingUser) {
      toast.error('Este nome já está em uso. Escolha outro nome.');
      return;
    }

    onNext(trimmedName);
  };

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="absolute top-4 left-4 hover:bg-accent transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative inline-block">
          <img 
            src={logo} 
            alt="Blynk" 
            className="h-24 w-24 mx-auto rounded-full shadow-xl ring-4 ring-primary/30 animate-in zoom-in duration-500" 
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 to-transparent animate-pulse" />
        </div>
        <h1 className="text-4xl font-bold text-foreground animate-in slide-in-from-bottom-2 duration-500">
          Bem-vindo ao Blynk
        </h1>
        <p className="text-lg text-muted-foreground animate-in slide-in-from-bottom-3 duration-500">
          Conecte-se com seus amigos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
          <label className="text-sm font-semibold text-foreground">
            Qual é o seu primeiro nome?
          </label>
          <Input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Digite seu primeiro nome"
            className="h-14 text-lg rounded-2xl border-2 shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-300 bg-background/50 backdrop-blur-sm"
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom-5 duration-500"
          disabled={!firstName.trim()}
        >
          Continuar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};
