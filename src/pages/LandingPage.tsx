import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Receipt, BarChart, FileText, AlertCircle, CheckCircle2, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/Navbar";
import { PricingCard } from "@/components/landing/PricingCard";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { Footer } from "@/components/landing/Footer";
import heroDashboard from "@/assets/hero-dashboard.png";

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
      description: "Adicione sua frota rapidamente com informações completas",
    },
    {
      icon: Receipt,
      title: "Lance despesas, receitas e abastecimentos com poucos cliques",
      description: "Registre todas as transações de forma rápida e organizada",
    },
    {
      icon: BarChart,
      title: "Visualize relatórios e gráficos automaticamente",
      description: "Dados sempre atualizados em tempo real",
    },
    {
      icon: FileText,
      title: "Histórico financeiro completo",
      description: "Acesse todo o histórico de transações quando precisar",
    },
  ];

  const planFeatures = [
    "Controle ilimitado de despesas",
    "Gestão completa de receitas",
    "Relatórios e gráficos detalhados",
    "Histórico completo das transações",
    "Backup automático na nuvem",
    "Atualizações gratuitas",
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Coluna Esquerda - Conteúdo */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                Controle Financeiro Inteligente
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Tenha Controle Total das <span className="text-primary">Finanças do Seu Veículo</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                Pare de perder dinheiro! Com o Meus Transportes, você registra despesas, acompanha receitas e descobre
                quanto seu veículo realmente rende.
              </p>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg">Controle completo de todas as despesas e receitas</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg">Relatórios detalhados para tomar decisões inteligentes</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg">Interface simples e fácil de usar</span>
                </li>
              </ul>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" onClick={scrollToPlans} className="text-lg px-8">
                  Começar Agora
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-lg px-8"
                >
                  Ver Recursos
                </Button>
              </div>
            </div>

            {/* Coluna Direita - Imagem */}
            <div className="relative lg:pl-8">
              <div className="relative rounded-xl overflow-hidden shadow-2xl">
                <img
                  src={heroDashboard}
                  alt="Dashboard do Meus Transportes mostrando controle de despesas e receitas"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Problema */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 mb-6 shadow-lg">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Sua frota está desorganizada, trazendo prejuízo escondido?
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Gerenciar gastos, receitas e abastecimentos no papel ou planilhas consome tempo e gera erros, resultando em
            descontrole financeiro e oportunidades perdidas.
          </p>
        </div>
      </section>

      {/* Seção Solução */}
      <section className="py-20 bg-green-50 dark:bg-green-950/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 mb-6 shadow-lg">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Chega de perder controle financeiro!</h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Automatize o registro de despesas, receitas e abastecimentos da sua frota em minutos. Tenha relatórios
            detalhados para decisões mais rápidas e assertivas.
          </p>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Veja como é simples resolver:</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Seção Público-Alvo */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Feito sob medida para:</h2>
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

      {/* Planos */}
      <section id="planos" className="py-16 px-4 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Escolha o plano perfeito para sua necessidade</h2>
          <p className="text-center text-lg text-muted-foreground mb-12">
            Selecione a quantidade de veículos ideal para seu negócio
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PricingCard
              name="Inicial"
              vehicles="1 Veículo"
              /*price={39.9}*/
              price={(39.9).toLocaleString("pt-BR", { style: "currency" })}
              paymentLink="https://pay.cakto.com.br/3nraaax_600812"
              features={planFeatures}
            />
            <PricingCard
              name="Intermediário"
              vehicles="Até 3 Veículos"
              price={69.9}
              paymentLink="https://pay.cakto.com.br/37sp94e"
              features={planFeatures}
            />
            <PricingCard
              name="Avançado"
              vehicles="Até 5 Veículos"
              price={99.9}
              paymentLink="https://pay.cakto.com.br/vcu9f9p"
              features={planFeatures}
              isPopular={true}
            />
            <PricingCard
              name="Premium"
              vehicles="Até 10 Veículos"
              price={199.9}
              paymentLink="https://pay.cakto.com.br/cgsmmcy"
              features={planFeatures}
            />
          </div>

          {/* Plano Personalizado */}
          <div className="mt-12">
            <div className="bg-background dark:bg-slate-800 rounded-lg p-8 max-w-2xl mx-auto border shadow-sm">
              <h3 className="text-2xl font-bold mb-3 text-center">Precisa de um plano personalizado?</h3>
              <p className="text-lg text-muted-foreground mb-6 text-center">
                Entre em contato conosco! Desenvolvemos soluções sob medida para sua frota, independente do tamanho ou
                necessidades específicas.
              </p>
              <div className="text-center">
                <Button size="lg" variant="outline" asChild>
                  <a href="mailto:contato@meustransportes.com">Falar com Especialista</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
