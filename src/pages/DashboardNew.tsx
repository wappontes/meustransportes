import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Fuel, DollarSign } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/formatters";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const DashboardNew = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fuelings, setFuelings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    try {
      const [transactionsRes, fuelingsRes, vehiclesRes, categoriesRes] = await Promise.all([
        supabase.from("transactions").select("*"),
        supabase.from("fuelings").select("*"),
        supabase.from("vehicles").select("*"),
        supabase.from("categories").select("*"),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (fuelingsRes.error) throw fuelingsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setTransactions(transactionsRes.data || []);
      setFuelings(fuelingsRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Layout userName="...">
        <div className="p-8">Carregando...</div>
      </Layout>
    );
  }

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const userTransactions = transactions.filter((t) => {
    const matchesVehicle = selectedVehicleId === "all" || t.vehicle_id === selectedVehicleId;
    return matchesVehicle;
  });

  const userFuelings = fuelings.filter((f) => {
    const matchesVehicle = selectedVehicleId === "all" || f.vehicle_id === selectedVehicleId;
    return matchesVehicle;
  });

  // Calculate monthly totals
  const monthlyTransactions = userTransactions.filter((t) =>
    isWithinInterval(parseLocalDate(t.date), { start: monthStart, end: monthEnd }),
  );

  const monthlyIncome = monthlyTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  const monthlyBalance = monthlyIncome - monthlyExpenses;

  // Separate by status
  const scheduledIncome = monthlyTransactions
    .filter((t) => t.type === "income" && t.status === "programado")
    .reduce((sum, t) => sum + t.amount, 0);

  const receivedIncome = monthlyTransactions
    .filter((t) => t.type === "income" && t.status === "efetivado")
    .reduce((sum, t) => sum + t.amount, 0);

  const scheduledExpenses = monthlyTransactions
    .filter((t) => t.type === "expense" && t.status === "programado")
    .reduce((sum, t) => sum + t.amount, 0);

  const paidExpenses = monthlyTransactions
    .filter((t) => t.type === "expense" && t.status === "efetivado")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate average fuel consumption
  const calculateAverageConsumption = () => {
    const consumptions: number[] = [];

    vehicles.forEach((vehicle) => {
      const vehicleFuelings = userFuelings
        .filter((f) => f.vehicle_id === vehicle.id)
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

  // Calculate cost per km driven
  const calculateCostPerKm = () => {
    let totalExpenses = 0;
    let totalKmDriven = 0;

    vehicles.forEach((vehicle) => {
      const vehicleFuelings = userFuelings
        .filter((f) => f.vehicle_id === vehicle.id && isWithinInterval(parseLocalDate(f.date), { start: monthStart, end: monthEnd }))
        .sort((a, b) => a.odometer - b.odometer);

      if (vehicleFuelings.length >= 2) {
        const kmDriven = vehicleFuelings[vehicleFuelings.length - 1].odometer - vehicleFuelings[0].odometer;
        totalKmDriven += kmDriven;
      }

      const vehicleExpenses = monthlyTransactions
        .filter((t) => t.type === "expense" && t.vehicle_id === vehicle.id && t.status === "efetivado")
        .reduce((sum, t) => sum + t.amount, 0);

      totalExpenses += vehicleExpenses;
    });

    return totalKmDriven > 0 ? totalExpenses / totalKmDriven : 0;
  };

  const costPerKm = calculateCostPerKm();

  // Calculate previous month for comparison
  const prevMonthTransactions = userTransactions.filter((t) => {
    const date = parseLocalDate(t.date);
    const prevMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    const prevMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
    return isWithinInterval(date, { start: prevMonthStart, end: prevMonthEnd });
  });

  const prevMonthIncome = prevMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const prevMonthExpenses = prevMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeChange =
    prevMonthIncome > 0 ? (((monthlyIncome - prevMonthIncome) / prevMonthIncome) * 100).toFixed(1) : "0";

  const expensesChange =
    prevMonthExpenses > 0 ? (((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses) * 100).toFixed(1) : "0";

  // Generate last 6 months data for trends
  const last6MonthsData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const monthTxs = userTransactions.filter((t) => isWithinInterval(parseLocalDate(t.date), { start, end }));

    const income = monthTxs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTxs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    return {
      month: format(date, "MMM/yy", { locale: ptBR }),
      receitas: income,
      despesas: expenses,
      resultado: income - expenses,
    };
  });

  // Expenses by category and status for stacked bar chart
  const expensesByCategory = categories
    .filter((c) => c.type === "expense")
    .map((cat) => ({
      name: cat.name,
      programado: monthlyTransactions
        .filter((t) => t.type === "expense" && t.category_id === cat.id && t.status === "programado")
        .reduce((sum, t) => sum + t.amount, 0),
      efetivado: monthlyTransactions
        .filter((t) => t.type === "expense" && t.category_id === cat.id && t.status === "efetivado")
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((item) => item.programado > 0 || item.efetivado > 0);

  // Income by category and status for stacked bar chart
  const incomeByCategory = categories
    .filter((c) => c.type === "income")
    .map((cat) => ({
      name: cat.name,
      programado: monthlyTransactions
        .filter((t) => t.type === "income" && t.category_id === cat.id && t.status === "programado")
        .reduce((sum, t) => sum + t.amount, 0),
      efetivado: monthlyTransactions
        .filter((t) => t.type === "income" && t.category_id === cat.id && t.status === "efetivado")
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((item) => item.programado > 0 || item.efetivado > 0);

  const COLORS = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#14B8A6", // teal
    "#F97316", // orange
  ];

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date.toISOString(),
      label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  });

  return (
    <Layout userName={user?.email || "Usuário"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">Visão geral financeira</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDate.toISOString()} onValueChange={(value) => setSelectedDate(new Date(value))}>
              <SelectTrigger className="w-[240px]">
                <SelectValue>{format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receitas do Mês</CardTitle>
              <TrendingUp className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(monthlyIncome)}</div>
              <div className="space-y-1 mt-2">
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Programado:</span>
                  <span className="text-amber-500 font-medium">{formatCurrency(scheduledIncome)}</span>
                </p>
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Recebido:</span>
                  <span className="text-success font-medium">{formatCurrency(receivedIncome)}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {Number(incomeChange) >= 0 ? "+" : ""}
                {incomeChange}% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(monthlyExpenses)}</div>
              <div className="space-y-1 mt-2">
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Programado:</span>
                  <span className="text-amber-500 font-medium">{formatCurrency(scheduledExpenses)}</span>
                </p>
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Efetivado:</span>
                  <span className="text-destructive font-medium">{formatCurrency(paidExpenses)}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {Number(expensesChange) >= 0 ? "+" : ""}
                {expensesChange}% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Custo Médio por Km</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(costPerKm > 0 ? costPerKm : 0)}/km
              </div>
              <p className="text-xs text-muted-foreground mt-1">Despesas efetivadas / Km rodado</p>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Média de Consumo</CardTitle>
              <Fuel className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {avgConsumption > 0 ? avgConsumption.toFixed(1) : "0.0"} km/l
              </div>
              <p className="text-xs text-muted-foreground mt-1">Média geral da frota</p>
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
                <CardContent className="overflow-x-auto">
                  <ChartContainer 
                    config={{
                      programado: { label: "Programado", color: "#F59E0B" },
                      efetivado: { label: "Efetivado", color: "hsl(var(--destructive))" },
                    }} 
                    className="h-[300px] w-full min-w-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expensesByCategory} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} tick={{ fontSize: 11 }} />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border border-border p-3 rounded shadow-lg">
                                  <p className="font-semibold mb-2">{payload[0].payload.name}</p>
                                  {payload.map((entry, index) => (
                                    <p key={index} className="text-sm flex items-center gap-2">
                                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                      <span>{entry.name}:</span>
                                      <span className="font-medium">{formatCurrency(Number(entry.value))}</span>
                                    </p>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="programado" stackId="a" fill="#F59E0B" name="Programado" />
                        <Bar dataKey="efetivado" stackId="a" fill="hsl(var(--destructive))" name="Efetivado" />
                      </BarChart>
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
                <CardContent className="overflow-x-auto">
                  <ChartContainer 
                    config={{
                      programado: { label: "Programado", color: "#F59E0B" },
                      efetivado: { label: "Efetivado", color: "hsl(var(--success))" },
                    }} 
                    className="h-[300px] w-full min-w-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeByCategory} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} tick={{ fontSize: 11 }} />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-background border border-border p-3 rounded shadow-lg">
                                  <p className="font-semibold mb-2">{payload[0].payload.name}</p>
                                  {payload.map((entry, index) => (
                                    <p key={index} className="text-sm flex items-center gap-2">
                                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                      <span>{entry.name}:</span>
                                      <span className="font-medium">{formatCurrency(Number(entry.value))}</span>
                                    </p>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="programado" stackId="a" fill="#F59E0B" name="Programado" />
                        <Bar dataKey="efetivado" stackId="a" fill="hsl(var(--success))" name="Efetivado" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Evolução Mensal (Últimos 6 Meses)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ChartContainer
                config={{
                  receitas: { label: "Receitas", color: "hsl(var(--success))" },
                  despesas: { label: "Despesas", color: "hsl(var(--destructive))" },
                }}
                className="h-[300px] w-full min-w-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last6MonthsData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 12 }}
                      width={60}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
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
                  <span className="text-2xl font-bold text-primary">{vehicles.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Abastecimentos este mês</span>
                  <span className="text-lg font-semibold">
                    {
                      userFuelings.filter((f) =>
                        isWithinInterval(parseLocalDate(f.date), { start: monthStart, end: monthEnd }),
                      ).length
                    }
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

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Dicas para Maximizar Seus Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Registre todas as transações para ter um controle preciso das finanças</li>
              <li>Monitore o consumo de combustível regularmente para identificar variações</li>
              <li>Use as categorias para entender melhor onde seu dinheiro está sendo gasto</li>
              <li>Revise seus gastos mensalmente e ajuste seu planejamento conforme necessário</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DashboardNew;
