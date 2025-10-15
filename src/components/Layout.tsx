import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Car, LogOut, LayoutDashboard, Fuel, Receipt, Tags, TrendingUp, User, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Plan } from "@/types";

interface LayoutProps {
  children: ReactNode;
  userName?: string;
}

const Layout = ({ children, userName }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [userPlan, setUserPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_id")
        .eq("id", user.id)
        .single();

      if (profile?.plan_id) {
        const { data: plan } = await supabase
          .from("plans")
          .select("*")
          .eq("id", profile.plan_id)
          .single();
        
        if (plan) setUserPlan(plan);
      }
    };

    fetchUserPlan();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
  };

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/relatorio-detalhado", icon: Receipt, label: "Relatório" },
    { path: "/vehicles", icon: Car, label: "Veículos" },
    { path: "/categories", icon: Tags, label: "Categorias" },
    { path: "/transactions", icon: TrendingUp, label: "Transações" },
    { path: "/fueling", icon: Fuel, label: "Abastecimento" },
    { path: "/plans", icon: FileText, label: "Planos" },
    { path: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Meus Transportes</h1>
              <p className="text-sm text-muted-foreground">
                Olá, {userName}
                {userPlan && (
                  <span className="ml-2 text-primary font-medium">| Plano: {userPlan.description}</span>
                )}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <nav className="bg-card border-b border-border overflow-x-auto">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default Layout;
