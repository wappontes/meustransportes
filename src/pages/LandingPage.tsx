import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Car, 
  Receipt, 
  Bell, 
  BarChart, 
  FileText, 
  AlertCircle, 
  CheckCircle2 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { Navbar } from "@/components/landing/Navbar";
import { PricingCard } from "@/components/landing/PricingCard";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { FAQItem } from "@/components/landing/FAQItem";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  const navigate = useNavigate();

  // Redirecionar usuários logados para o dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const scrollToPlans = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    {
      icon: Car,
      title: "Cadastre seus veículos em segundos",
      description: "Adicione sua frota rapidamente e comece a gerenciar imediatamente",
    },
    {
      icon: Receipt,
      title: "Lance despesas, receitas e abastecimentos",
      description: "Registre transações de forma rápida com poucos cliques",
    },
    {
      icon: Bell,
      title: "Receba alertas inteligentes",
      description: "Notificações para manutenção e gastos fora do padrão",
    },
    {
      icon: BarChart,
      title: "Visualize relatórios automaticamente",
      description: "Gráficos e dados sempre atualizados em tempo real",
    },
    {
      icon: FileText,
      title: "Histórico financeiro completo",
      description: "Tenha todos os dados da sua frota sempre à mão",
    },
  ];

  const planFeatures = [
    "Controle ilimitado de despesas",
    "Gestão completa de receitas",
    "Relatórios e gráficos detalhados",
    "Histórico completo das transações",
    "Alertas personalizados",
    "Backup automático na nuvem",
    "Suporte prioritário",
    "Atualizações gratuitas",
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Seção Hero */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Controle total da sua frota, sem dor de cabeça!
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Transforme a gestão de veículos, simplifique despesas, receitas e abastecimentos – tudo em um só lugar.
          </p>
          <Button size="lg" onClick={scrollToPlans} className="text-lg px-8 py-6">
            Comece Agora
          </Button>
        </div>
      </section>

      {/* Seção Dor Latente */}
      <section className="py-16 bg-red-50 dark:bg-red-950/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Sua frota está desorganizada, trazendo prejuízo escondido?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Gerenciar gastos, receitas e abastecimentos no papel ou planilhas consome tempo e gera erros, 
            resultando em descontrole financeiro e oportunidades perdidas.
          </p>
        </div>
      </section>

      {/* Seção Transição para Solução */}
      <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Chega de perder controle financeiro!
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Automatize o registro de despesas, receitas e abastecimentos da sua frota em minutos. 
            Tenha relatórios detalhados e alertas para decisões mais rápidas e assertivas.
          </p>
        </div>
      </section>

      {/* Seção Como Funciona */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Veja como é simples resolver:
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Seção Público-Alvo */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Feito sob medida para:
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary w-6 h-6 mt-1 shrink-0" />
              <p className="text-lg">Pequenas e médias empresas com frota própria</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary w-6 h-6 mt-1 shrink-0" />
              <p className="text-lg">Prestadores de serviço e autônomos com 1 ou mais veículos</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary w-6 h-6 mt-1 shrink-0" />
              <p className="text-lg">
                Transportadoras, locadoras de veículos, oficinas e qualquer negócio que dependa de veículos
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Planos */}
      <section id="planos" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Escolha o plano perfeito para sua necessidade
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg">
            Todos os planos incluem 30 dias de garantia
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PricingCard
              name="Inicial"
              vehicles="1 Veículo"
              price={37}
              paymentLink="https://pay.cakto.com.br/3nraaax_600812"
              features={planFeatures}
            />
            <PricingCard
              name="Intermediário"
              vehicles="Até 3 Veículos"
              price={67}
              paymentLink="https://pay.cakto.com.br/37sp94e"
              features={planFeatures}
            />
            <PricingCard
              name="Avançado"
              vehicles="Até 5 Veículos"
              price={97}
              paymentLink="https://pay.cakto.com.br/vcu9f9p"
              features={planFeatures}
              isPopular={true}
            />
            <PricingCard
              name="Premium"
              vehicles="Até 10 Veículos"
              price={197}
              paymentLink="https://pay.cakto.com.br/cgsmmcy"
              features={planFeatures}
            />
          </div>
        </div>
      </section>

      {/* Seção FAQ */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Perguntas Frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <FAQItem
              value="item-1"
              question="Preciso de cartão de crédito para testar?"
              answer="Não! Você pode começar gratuitamente e testar todas as funcionalidades por 30 dias. Apenas cadastre-se com seu email."
            />
            <FAQItem
              value="item-2"
              question="Posso cancelar quando quiser?"
              answer="Sim! Você tem total liberdade para cancelar sua assinatura a qualquer momento, sem burocracia e sem taxas de cancelamento."
            />
            <FAQItem
              value="item-3"
              question="Tem suporte incluso?"
              answer="Sim! Todos os planos incluem suporte prioritário por email e chat. Nossa equipe está pronta para ajudar você a aproveitar ao máximo o sistema."
            />
            <FAQItem
              value="item-4"
              question="Como funciona a garantia?"
              answer="Se você não ficar satisfeito nos primeiros 30 dias, devolvemos 100% do seu investimento, sem perguntas. Sua satisfação é nossa prioridade."
            />
            <FAQItem
              value="item-5"
              question="Posso mudar de plano depois?"
              answer="Claro! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento, de acordo com suas necessidades. As mudanças são aplicadas imediatamente."
            />
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
}
