import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Copy, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TwoFactorQRCodeProps {
  secret: string;
  userEmail: string;
}

export default function TwoFactorQRCode({ secret, userEmail }: TwoFactorQRCodeProps) {
  const appName = 'Blynk';
  const otpauthUrl = `otpauth://totp/${appName}:${userEmail}?secret=${secret}&issuer=${appName}`;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Código copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Aviso de Segurança */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-semibold text-destructive">⚠️ ATENÇÃO - NÃO COMPARTILHE!</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Nunca compartilhe este QR code ou código com ninguém</li>
              <li>• Guarde o código em local seguro</li>
              <li>• Qualquer pessoa com acesso pode acessar sua conta</li>
              <li>• Blynk nunca pedirá este código por mensagem ou telefone</li>
            </ul>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <h3 className="font-semibold">Seu QR Code de Autenticação</h3>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Escaneie com seu app autenticador (Google Authenticator, Authy, etc.)
          </p>

          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG 
              value={otpauthUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="w-full space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Ou digite o código manualmente:
            </p>
            <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
              <code className="flex-1 text-center font-mono text-sm break-all">
                {secret}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopySecret}
                className="flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-muted/50 rounded-xl p-4">
        <h4 className="font-semibold mb-3">Como configurar:</h4>
        <ol className="text-sm text-muted-foreground space-y-2">
          <li>1. Baixe um app autenticador (Google Authenticator, Authy, Microsoft Authenticator)</li>
          <li>2. Abra o app e escolha "Adicionar conta"</li>
          <li>3. Escaneie o QR code acima ou digite o código manualmente</li>
          <li>4. O app gerará códigos de 6 dígitos que mudam a cada 30 segundos</li>
          <li>5. Use esses códigos ao fazer login no Blynk</li>
        </ol>
      </div>
    </div>
  );
}