import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Eye, EyeOff, Sparkles, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/blynk-logo.jpg';
import { PhoneVerification } from '@/components/auth/PhoneVerification';
import { requestNotificationPermission, showNotification } from '@/utils/pushNotifications';
import { motion } from 'framer-motion';
import { loginRateLimiter, validatePassword } from '@/utils/securityValidation';

interface AuthLoginProps {
  onBack: () => void;
  onForgotPassword: (email: string) => void;
  onSwitchToSignup?: () => void;
}

export const AuthLogin = ({ onBack, onForgotPassword, onSwitchToSignup }: AuthLoginProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const prefilledEmail = location.state?.prefilledEmail;
    if (prefilledEmail) {
      setCredential(prefilledEmail);
      setRememberMe(true);
    } else {
      const savedCredential = localStorage.getItem('blynk_saved_credential');
      if (savedCredential) {
        setCredential(savedCredential);
        setRememberMe(true);
      }
    }
  }, [location]);

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential);

  const saveAccount = async (userId: string, email: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, username, avatar_url')
        .eq('id', userId)
        .single();

      if (profile) {
        const accounts = JSON.parse(localStorage.getItem('blynk_saved_accounts') || '[]');
        const existingIndex = accounts.findIndex((acc: any) => acc.userId === userId);
        
        const accountData = {
          userId,
          email,
          firstName: profile.first_name,
          username: profile.username,
          avatarUrl: profile.avatar_url,
        };

        if (existingIndex >= 0) {
          accounts[existingIndex] = accountData;
        } else {
          accounts.push(accountData);
        }

        localStorage.setItem('blynk_saved_accounts', JSON.stringify(accounts));
        localStorage.setItem('blynk_saved_credential', email);

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem(`blynk_session_${userId}`, JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
    }
  };

  const generateTwoFactorCode = () => {
    return Math.floor(10 + Math.random() * 90).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credential.trim()) {
      toast.error('Digite seu e-mail ou telefone');
      return;
    }
    
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    // Rate limiting check
    if (!loginRateLimiter.check(credential.trim())) {
      toast.error('Muitas tentativas de login. Aguarde um minuto.', {
        icon: '🔒',
        duration: 5000
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: isEmail ? credential.trim() : undefined,
        phone: !isEmail ? credential.trim() : undefined,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('E-mail/telefone ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Confirme seu e-mail antes de fazer login');
        } else {
          toast.error('Erro ao fazer login. Tente novamente.');
        }
        setLoading(false);
        return;
      }

      const { data: twoFactorData } = await supabase
        .from('two_factor_auth')
        .select('enabled')
        .eq('user_id', data.user.id)
        .single();

      if (twoFactorData?.enabled) {
        await supabase.auth.signOut();
        
        const code = generateTwoFactorCode();
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + 10);

        await supabase.from('two_factor_codes').insert({
          user_id: data.user.id,
          code,
          expires_at: expiresAt.toISOString(),
        });
        
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          showNotification('Código de Verificação Blynk', {
            body: `Seu código de autenticação de dois fatores é: ${code}`,
            icon: logo,
            requireInteraction: true,
          });
        }
        
        toast.success(`Seu código de verificação é: ${code}`, { duration: 10000 });

        navigate('/two-factor-verification', {
          state: {
            tempUserId: data.user.id,
            credential: credential.trim(),
            password,
            isEmail
          }
        });
        return;
      } else if (!isEmail) {
        await supabase.auth.signOut();
        setTempUserId(data.user.id);
        setShowPhoneVerification(true);
      } else {
        if (rememberMe) {
          await saveAccount(data.user.id, credential.trim());
        } else {
          localStorage.removeItem('blynk_saved_credential');
        }
        toast.success('Login realizado com sucesso!');
        navigate('/feed');
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (showPhoneVerification) {
    return (
      <PhoneVerification
        phoneNumber={credential}
        onVerified={async () => {
          if (!tempUserId) return;
          
          try {
            const { error } = await supabase.auth.signInWithPassword({
              phone: credential.trim(),
              password,
            });

            if (error) throw error;
            
            toast.success('Login realizado com sucesso!');
            setShowPhoneVerification(false);
          } catch (error) {
            toast.error('Erro ao completar login');
          }
        }}
        onBack={() => {
          setShowPhoneVerification(false);
          setTempUserId(null);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-6">
      {/* Glass Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative bg-card/80 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl overflow-hidden"
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
            <div className="flex-1" />
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>

          {/* Logo & Title */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center space-y-4"
          >
            <motion.div 
              className="relative inline-block"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img 
                src={logo} 
                alt="Blynk" 
                className="h-20 w-20 mx-auto rounded-2xl shadow-xl ring-4 ring-primary/20" 
              />
              <motion.div 
                className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-4 border-card flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            </motion.div>
            
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Bem-vindo!
              </h1>
              <p className="text-muted-foreground mt-1">
                Entre na sua conta Blynk
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <label className="text-sm font-medium text-foreground/80">
                E-mail ou Telefone
              </label>
              <Input
                type="text"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="exemplo@email.com"
                className="h-12 text-base rounded-xl border-2 border-border/50 bg-background/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                required
                autoFocus
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <label className="text-sm font-medium text-foreground/80">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 text-base rounded-xl border-2 border-border/50 bg-background/50 pr-12 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-2"
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Lembrar-me
                </label>
              </div>
              
              <button
                type="button"
                className="text-sm text-primary hover:underline font-medium"
                onClick={() => {
                  if (credential && isEmail) {
                    onForgotPassword(credential);
                  } else {
                    toast.error('Digite um e-mail válido primeiro');
                  }
                }}
              >
                Esqueceu a senha?
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300"
                disabled={!credential || password.length < 6 || loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </div>
                ) : (
                  'Entrar'
                )}
              </Button>
            </motion.div>

            {onSwitchToSignup && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center pt-2"
              >
                <p className="text-sm text-muted-foreground">
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToSignup}
                    className="text-primary font-semibold hover:underline"
                  >
                    Criar conta
                  </button>
                </p>
              </motion.div>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};
