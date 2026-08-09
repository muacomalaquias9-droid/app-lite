import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, X } from 'lucide-react';
import blynkLogo from '@/assets/blynk-logo.jpg';

export default function InstallPWA() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="ml-auto"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex justify-center mb-4">
            <img src={blynkLogo} alt="Blynk" className="h-24 w-auto" />
          </div>
          <CardTitle className="text-2xl">Instalar Blynk</CardTitle>
          <CardDescription>
            Instale o app no seu dispositivo para uma melhor experiência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Acesso rápido</h3>
                <p className="text-sm text-muted-foreground">
                  Lance o app direto da tela inicial
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Experiência nativa</h3>
                <p className="text-sm text-muted-foreground">
                  Interface otimizada para mobile
                </p>
              </div>
            </div>
          </div>

          {isInstallable ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Instalar Agora
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Para instalar no seu dispositivo:
              </p>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-semibold">No Android (Chrome):</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Toque no menu (3 pontos)</li>
                  <li>Selecione "Instalar app"</li>
                  <li>Confirme a instalação</li>
                </ol>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-semibold">No iPhone (Safari):</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Toque no ícone de compartilhar</li>
                  <li>Selecione "Adicionar à Tela de Início"</li>
                  <li>Toque em "Adicionar"</li>
                </ol>
              </div>
            </div>
          )}

          <Button variant="outline" onClick={() => navigate('/')} className="w-full">
            Continuar no navegador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
