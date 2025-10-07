import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Transaction, Fueling, Vehicle } from "@/types";
import { TrendingUp, TrendingDown, Fuel, DollarSign } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const DashboardNew = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [transactions] = useLocalStorage<Transaction[]>("transactions", []);
  const [fuelings] = useLocalStorage<Fueling[]>("fuelings", []);
  const [vehicles] = useLocalStorage<Vehicle[]>("vehicles", []);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
      navigate("/");
    } else {
      setUser(JSON.parse(currentUser));
    }
  }, [navigate]);

  if (!user) return null;

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const userTransactions = transactions.filter(t => t.userId === user.id);
  const userFuelings = fuelings.filter(f => f.userId === user.id);
  const userVehicles = vehicles.filter(v => v.userId === user.id);

  // Calculate monthly totals
  const monthlyTransactions = userTransactions.filter(t => 
    isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
  );

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyBalance = monthlyIncome - monthlyExpenses;

  // Calculate average fuel consumption
  const calculateAverageConsumption = () => {
    const consumptions: number[] = [];

    userVehicles.forEach(vehicle => {
      const vehicleFuelings = userFuelings
        .filter(f => f.vehicleId === vehicle.id)
        .sort((a, b) => a.odometer - b.odometer);

      if (vehicleFuelings.length >= 2) {
        let totalKm = 0;
        let totalLiters = 0;

        for (let i = 1; i < vehicleFuelings.length; i++) {
          const kmDiff = vehicleFuelings[i].odometer - vehicleFuelings[i - 1].odometer;
          totalKm += kmDiff;
          totalLiters += vehicleFuelings[i].liters;
        }

        if (totalLiters > 0) {
          consumptions.push(totalKm / totalLiters);
        }
      }
    });

    if (consumptions.length === 0) return 0;
    return consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length;
  };

  const avgConsumption = calculateAverageConsumption();

  // Calculate previous month for comparison
  const prevMonthTransactions = userTransactions.filter(t => {
    const date = new Date(t.date);
    const prevMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const prevMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    return isWithinInterval(date, { start: prevMonthStart, end: prevMonthEnd });
  });

  const prevMonthIncome = prevMonthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const prevMonthExpenses = prevMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeChange = prevMonthIncome > 0 
    ? ((monthlyIncome - prevMonthIncome) / prevMonthIncome * 100).toFixed(1)
    : "0";

  const expensesChange = prevMonthExpenses > 0
    ? ((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses * 100).toFixed(1)
    : "0";

  return (
    <Layout userName={user.name}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do mês atual</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas do Mês
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                R$ {monthlyIncome.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Number(incomeChange) >= 0 ? "+" : ""}{incomeChange}% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas do Mês
              </CardTitle>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {monthlyExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Number(expensesChange) >= 0 ? "+" : ""}{expensesChange}% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resultado Mensal
              </CardTitle>
              <DollarSign className={`w-4 h-4 ${monthlyBalance >= 0 ? "text-success" : "text-destructive"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthlyBalance >= 0 ? "text-success" : "text-destructive"}`}>
                R$ {monthlyBalance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receitas - Despesas
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média de Consumo
              </CardTitle>
              <Fuel className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {avgConsumption > 0 ? avgConsumption.toFixed(1) : "0.0"} km/l
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Média geral da frota
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Resumo da Frota</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de Veículos</span>
                  <span className="text-2xl font-bold text-primary">{userVehicles.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Abastecimentos este mês</span>
                  <span className="text-lg font-semibold">
                    {userFuelings.filter(f => 
                      isWithinInterval(new Date(f.date), { start: monthStart, end: monthEnd })
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Transações este mês</span>
                  <span className="text-lg font-semibold">{monthlyTransactions.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Dicas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Registre todos os abastecimentos para cálculo preciso de consumo</li>
                <li>• Categorize suas receitas e despesas para melhor controle</li>
                <li>• Monitore o consumo médio para identificar problemas mecânicos</li>
                <li>• Compare os resultados mensais para identificar tendências</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardNew;
