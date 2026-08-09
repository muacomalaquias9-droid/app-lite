import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageCircle, Mail, Phone } from "lucide-react";

export default function Help() {
  const faqs = [
    {
      question: "Como criar uma conta?",
      answer: "Para criar uma conta, clique em 'Registrar' na página inicial, preencha seus dados e confirme seu email."
    },
    {
      question: "Como alterar minha senha?",
      answer: "Vá para Configurações > Segurança > Alterar Senha. Digite sua senha atual e a nova senha."
    },
    {
      question: "Como reportar conteúdo inadequado?",
      answer: "Clique nos três pontos em qualquer publicação e selecione 'Reportar'. Escolha o motivo e envie."
    },
    {
      question: "Como desativar notificações?",
      answer: "Acesse Configurações do App > Notificações e ajuste suas preferências."
    },
    {
      question: "Como bloquear um usuário?",
      answer: "Vá ao perfil do usuário, clique nos três pontos e selecione 'Bloquear'."
    }
  ];

  return (
    <MainLayout title="Ajuda e Suporte">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Central de Ajuda</h1>
          <p className="text-muted-foreground">
            Encontre respostas para as perguntas mais frequentes
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Perguntas Frequentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Entre em Contato</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Chat ao Vivo</p>
                <p className="text-sm text-muted-foreground">Disponível das 9h às 18h</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Email</p>
                <p className="text-sm text-muted-foreground">suporte@blynk.com</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Telefone</p>
                <p className="text-sm text-muted-foreground">+244 123 456 789</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="font-bold mb-2">Precisa de mais ajuda?</h3>
          <p className="text-sm text-muted-foreground">
            Nossa equipe de suporte está sempre disponível para ajudá-lo. Entre em contato através dos canais acima.
          </p>
        </Card>
      </div>
    </MainLayout>
  );
}
