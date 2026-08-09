import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import TwoFactorCodeInput from '@/components/TwoFactorCodeInput';
import logo from '@/assets/blynk-logo.jpg';
import { requestNotificationPermission, showNotification } from '@/utils/pushNotifications';

export default function TwoFactorVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  
  const { tempUserId, credential, password, isEmail } = location.state || {};

  useEffect(() => {
    if (!tempUserId || !credential || !password) {
      toast.error('Dados de autenticação inválidos');
      navigate('/auth');
    }
  }, [tempUserId, credential, password, navigate]);

  const generateTwoFactorCode = () => {
    return Math.floor(10 + Math.random() * 90).toString();
  };

  const handleVerifyCode = async (code: string) => {
    if (!tempUserId) return;

    setLoading(true);
    try {
      // Verificar código
      const { data: codeData, error: codeError } = await supabase
        .from('two_factor_codes')
        .select('*')
        .eq('user_id', tempUserId)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (codeError || !codeData) {
        toast.error('Código inválido ou expirado');
        setLoading(false);
        return;
      }

      // Marcar código como usado
      await supabase
        .from('two_factor_codes')
        .update({ used: true })
        .eq('id', codeData.id);

      // Fazer login novamente
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: isEmail ? credential.trim() : undefined,
        phone: !isEmail ? credential.trim() : undefined,
        password,
      });

      if (loginError) {
        toast.error('Erro ao completar login');
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (error) {
      toast.error('Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!tempUserId) return;

    setLoading(true);
    try {
      const code = generateTwoFactorCode();
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + 10); // 10 segundos

      await supabase.from('two_factor_codes').insert({
        user_id: tempUserId,
        code,
        expires_at: expiresAt.toISOString(),
      });

      // Enviar notificação push
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        showNotification('Novo Código de Verificação Blynk', {
          body: `Seu novo código de autenticação é: ${code}`,
          icon: logo,
          requireInteraction: true,
        });
      }
      
      toast.success(`Novo código: ${code}`, { duration: 10000 });
    } catch (error) {
      toast.error('Erro ao reenviar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <Button
          variant="ghost"
          onClick={() => navigate('/auth')}
          className="mb-4"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Voltar
        </Button>
        
        <div className="text-center space-y-4 mb-8">
          <img src={logo} alt="Blynk" className="h-16 w-16 mx-auto rounded-full" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Autenticação de Dois Fatores</h1>
            <p className="text-muted-foreground mt-2">
              Proteja sua conta com segurança adicional
            </p>
          </div>
        </div>
        
        <TwoFactorCodeInput
          onVerify={handleVerifyCode}
          onResend={handleResendCode}
          loading={loading}
        />
      </div>
    </div>
  );
}
