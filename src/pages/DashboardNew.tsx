import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Transaction, Fueling, Vehicle, Category } from "@/types";
import { TrendingUp, TrendingDown, Fuel, DollarSign } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const DashboardNew = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [transactions] = useLocalStorage<Transaction[]>("transactions", []);
  const [fuelings] = useLocalStorage<Fueling[]>("fuelings", []);
  const [vehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [categories] = useLocalStorage<Category[]>("categories", []);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
      navigate("/");
    } else {
      setUser(JSON.parse(currentUser));
    }
  }, [navigate]);

  if (!user) return null;

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const userTransactions = transactions.filter(t => t.userId === user.id);
  const userFuelings = fuelings.filter(f => f.userId === user.id);
  const userVehicles = vehicles.filter(v => v.userId === user.id);

  // Calculate monthly totals
  const monthlyTransactions = userTransactions.filter(t => 
    isWithinInterval(parseLocalDate(t.date), { start: monthStart, end: monthEnd })
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
    const date = parseLocalDate(t.date);
    const prevMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
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

  // Generate last 6 months data for trends
  const last6MonthsData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    const monthTxs = userTransactions.filter(t => 
      isWithinInterval(parseLocalDate(t.date), { start, end })
    );
    
    const income = monthTxs.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    
    return {
      month: format(date, "MMM/yy", { locale: ptBR }),
      receitas: income,
      despesas: expenses,
      resultado: income - expenses
    };
  });

  // Expenses by category for pie chart
  const expensesByCategory = categories
    .filter(c => c.type === "expense")
    .map(cat => ({
      name: cat.name,
      value: monthlyTransactions
        .filter(t => t.type === "expense" && t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0)
    }))
    .filter(item => item.value > 0);

  // Income by category for pie chart
  const incomeByCategory = categories
    .filter(c => c.type === "income")
    .map(cat => ({
      name: cat.name,
      value: monthlyTransactions
        .filter(t => t.type === "income" && t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0)
    }))
    .filter(item => item.value > 0);

  const COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date.toISOString(),
      label: format(date, "MMMM 'de' yyyy", { locale: ptBR })
    };
  });

  return (
    <Layout userName={user.name}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">Visão geral financeira</p>
          </div>
          <Select
            value={selectedDate.toISOString()}
            onValueChange={(value) => setSelectedDate(new Date(value))}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <CardTitle>Evolução Mensal (Últimos 6 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  receitas: { label: "Receitas", color: "hsl(var(--success))" },
                  despesas: { label: "Despesas", color: "hsl(var(--destructive))" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last6MonthsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="receitas" fill="hsl(var(--success))" name="Receitas" />
                    <Bar dataKey="despesas" fill="hsl(var(--destructive))" name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

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
                      isWithinInterval(parseLocalDate(f.date), { start: monthStart, end: monthEnd })
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
        </div>

        {(expensesByCategory.length > 0 || incomeByCategory.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {expensesByCategory.length > 0 && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Despesas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{}}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, value }) => {
                            const val = typeof value === 'number' ? value : 0;
                            return `${name}\nR$ ${val.toFixed(2)} (${(percent * 100).toFixed(1)}%)`;
                          }}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
                              return (
                                <div className="bg-background border border-border p-2 rounded shadow-lg">
                                  <p className="font-semibold">{payload[0].name}</p>
                                  <p className="text-sm">R$ {value.toFixed(2)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {incomeByCategory.length > 0 && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Receitas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{}}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                        <Pie
                          data={incomeByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, value }) => {
                            const val = typeof value === 'number' ? value : 0;
                            return `${name}\nR$ ${val.toFixed(2)} (${(percent * 100).toFixed(1)}%)`;
                          }}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {incomeByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
                              return (
                                <div className="bg-background border border-border p-2 rounded shadow-lg">
                                  <p className="font-semibold">{payload[0].name}</p>
                                  <p className="text-sm">R$ {value.toFixed(2)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

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
    </Layout>
  );
};

export default DashboardNew;
