import { useEffect } from 'react';
import { Zap } from 'lucide-react';
import logo from '@/assets/paji-logo.jpg';

interface AuthLoadingProps {
  onComplete?: () => void;
  isInitial?: boolean;
}

export const AuthLoading = ({ onComplete, isInitial }: AuthLoadingProps) => {
  useEffect(() => {
    if (!isInitial && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [onComplete, isInitial]);

  if (isInitial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <img src={logo} alt="Paji" className="h-24 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <div className="relative">
        <Zap className="h-24 w-24 text-primary animate-pulse" />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-ping" />
      </div>
      
      <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 duration-700 delay-300">
        <h1 className="text-5xl font-bold text-primary tracking-wider">
          PAJI
        </h1>
        <p className="text-muted-foreground">Criando sua conta...</p>
      </div>
    </div>
  );
};
