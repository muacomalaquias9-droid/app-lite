import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { X, ChevronRight } from 'lucide-react';
import logo from '@/assets/blynk-logo.jpg';

interface SavedAccount {
  userId: string;
  email: string;
  firstName: string;
  avatarUrl: string | null;
  username: string;
}

export default function SavedAccounts() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  // Redirecionar usuários já autenticados
  useEffect(() => {
    if (!loading && user) {
      navigate('/feed', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    loadSavedAccounts();
  }, []);

  const loadSavedAccounts = () => {
    const accounts = localStorage.getItem('blynk_saved_accounts');
    if (accounts) {
      setSavedAccounts(JSON.parse(accounts));
    }
  };

  const handleAccountClick = async (account: SavedAccount) => {
    try {
      // Login automático com a sessão salva
      const savedSession = localStorage.getItem(`blynk_session_${account.userId}`);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (error) {
          // Se a sessão expirou, redirecionar para login com email preenchido
          navigate('/auth', { state: { prefilledEmail: account.email } });
        } else {
          toast.success(`Bem-vindo de volta, ${account.firstName}!`);
          navigate('/feed');
        }
      } else {
        // Redirecionar para login com email preenchido
        navigate('/auth', { state: { prefilledEmail: account.email } });
      }
    } catch (error) {
      toast.error('Erro ao entrar na conta');
    }
  };

  const handleRemoveAccount = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedAccounts = savedAccounts.filter(acc => acc.userId !== userId);
    setSavedAccounts(updatedAccounts);
    localStorage.setItem('blynk_saved_accounts', JSON.stringify(updatedAccounts));
    localStorage.removeItem(`blynk_session_${userId}`);
    toast.success('Conta removida');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <img 
              src={logo} 
              alt="Blynk" 
              className="h-16 w-16 mx-auto rounded-full shadow-lg ring-2 ring-primary/20 animate-in zoom-in duration-500" 
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-transparent animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Selecione uma conta
          </h1>
        </div>

        <div className="space-y-3">
          {savedAccounts.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">Nenhuma conta salva</p>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full h-14 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                Entrar em uma conta
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
                className="w-full h-14 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2"
              >
                Criar conta nova
              </Button>
            </div>
          ) : (
            <>
              {savedAccounts.map((account) => (
                <div
                  key={account.userId}
                  onClick={() => handleAccountClick(account)}
                  className="relative flex items-center gap-4 p-4 bg-card border-2 border-border rounded-2xl cursor-pointer hover:bg-accent hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                >
                  <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                    <AvatarImage src={account.avatarUrl || ''} />
                    <AvatarFallback className="text-lg font-semibold">
                      {account.firstName[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-foreground truncate">
                      {account.firstName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{account.username}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleRemoveAccount(account.userId, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              ))}

              <Button
                variant="outline"
                onClick={() => navigate('/auth')}
                className="w-full h-14 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2"
              >
                Entrar em outra conta
              </Button>
            </>
          )}
        </div>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
            className="text-primary"
          >
            Criar conta nova
          </Button>
        </div>
      </div>
    </div>
  );
}
