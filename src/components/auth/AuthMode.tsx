import { Button } from '@/components/ui/button';
import logo from '@/assets/blynk-logo.jpg';

interface AuthModeProps {
  onSelectMode: (mode: 'login' | 'signup') => void;
}

export const AuthMode = ({ onSelectMode }: AuthModeProps) => {
  return (
    <div className="w-full max-w-md space-y-10 animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <img 
            src={logo} 
            alt="Blynk" 
            className="h-28 w-28 mx-auto rounded-full shadow-2xl ring-4 ring-primary/30 animate-in zoom-in duration-500" 
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 to-transparent animate-pulse" />
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent animate-in slide-in-from-bottom-2 duration-500">
          Blynk
        </h1>
        <p className="text-muted-foreground text-xl font-medium animate-in slide-in-from-bottom-3 duration-500">
          Conecte-se com seus amigos e compartilhe momentos
        </p>
      </div>

      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
        <Button
          onClick={() => onSelectMode('login')}
          className="w-full h-16 text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] font-semibold"
          size="lg"
        >
          Entrar
        </Button>
        
        <Button
          onClick={() => onSelectMode('signup')}
          variant="outline"
          className="w-full h-16 text-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 font-semibold"
          size="lg"
        >
          Criar Conta
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground animate-in fade-in duration-500 px-4">
        Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade
      </p>
    </div>
  );
};