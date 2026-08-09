import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <MainLayout title="Termos e Políticas">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Termos e Políticas</h1>
          <p className="text-muted-foreground">Última atualização: Dezembro 2024</p>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Termos de Serviço</h2>
          
          <div className="space-y-6 text-foreground">
            <section>
              <h3 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ao acessar e usar o Blynk, você aceita e concorda em cumprir estes Termos de Serviço. 
                Se você não concordar com qualquer parte destes termos, não deverá usar nosso serviço.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3">2. Uso do Serviço</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Você concorda em usar o Blynk apenas para fins legais e de acordo com estes Termos. É proibido:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Publicar conteúdo ilegal, ofensivo ou inadequado</li>
                <li>Violar direitos de propriedade intelectual</li>
                <li>Assediar ou prejudicar outros usuários</li>
                <li>Usar o serviço para spam ou fraudes</li>
                <li>Tentar hackear ou comprometer a segurança do sistema</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3">3. Conta de Usuário</h3>
              <p className="text-muted-foreground leading-relaxed">
                Você é responsável por manter a confidencialidade de sua conta e senha. 
                Você deve notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3">4. Conteúdo do Usuário</h3>
              <p className="text-muted-foreground leading-relaxed">
                Você mantém todos os direitos sobre o conteúdo que publica no Blynk. 
                No entanto, ao publicar conteúdo, você nos concede uma licença para exibir, 
                distribuir e modificar esse conteúdo conforme necessário para operar o serviço.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3">5. Privacidade</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sua privacidade é importante para nós. Coletamos e usamos suas informações 
                de acordo com nossa Política de Privacidade. Não compartilhamos suas informações 
                pessoais com terceiros sem seu consentimento.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3">6. Moderação de Conteúdo</h3>
              <p className="text-muted-foreground leading-relaxed">
                Reservamo-nos o direito de remover qualquer conteúdo que viole estes Termos 
                ou nossas diretrizes da comunidade. Contas que violarem repetidamente 
                nossos termos podem ser suspensas ou encerradas.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3">7. Limitação de Responsabilidade</h3>
              <p className="text-muted-foreground leading-relaxed">
                O Blynk é fornecido "como está". Não garantimos que o serviço será 
                ininterrupto ou livre de erros. Não somos responsáveis por quaisquer 
                danos resultantes do uso ou incapacidade de usar nosso serviço.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3">8. Alterações aos Termos</h3>
              <p className="text-muted-foreground leading-relaxed">
                Podemos atualizar estes Termos periodicamente. Notificaremos você sobre 
                alterações significativas. O uso continuado do serviço após as alterações 
                constitui aceitação dos novos Termos.
              </p>
            </section>

            <Separator />

            <section>
              <h3 className="text-xl font-semibold mb-3">9. Contato</h3>
              <p className="text-muted-foreground leading-relaxed">
                Se você tiver dúvidas sobre estes Termos, entre em contato conosco em: 
                legal@blynk.com
              </p>
            </section>
          </div>
        </Card>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="font-bold mb-2">Políticas de Cookies</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Usamos cookies para melhorar sua experiência no Blynk. Cookies são pequenos 
            arquivos de texto armazenados no seu dispositivo que nos ajudam a entender 
            como você usa nosso serviço.
          </p>
          <p className="text-sm text-muted-foreground">
            Ao continuar usando o Blynk, você concorda com o uso de cookies conforme 
            descrito em nossa política.
          </p>
        </Card>
      </div>
    </MainLayout>
  );
}
