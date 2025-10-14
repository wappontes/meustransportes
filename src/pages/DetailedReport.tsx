import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2, ArrowLeft } from "lucide-react";
import { format, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/formatters";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const DetailedReport = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return format(date, "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fuelings, setFuelings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

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

  const filteredTransactions = transactions.filter((t) => {
    const txDate = parseLocalDate(t.date);
    return isWithinInterval(txDate, {
      start: new Date(startDate),
      end: new Date(endDate),
    });
  });

  const filteredFuelings = fuelings.filter((f) => {
    const fDate = parseLocalDate(f.date);
    return isWithinInterval(fDate, {
      start: new Date(startDate),
      end: new Date(endDate),
    });
  });

  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  const scheduledIncome = filteredTransactions
    .filter((t) => t.type === "income" && t.status === "programado")
    .reduce((sum, t) => sum + t.amount, 0);
  const receivedIncome = filteredTransactions
    .filter((t) => t.type === "income" && t.status === "efetivado")
    .reduce((sum, t) => sum + t.amount, 0);

  const scheduledExpenses = filteredTransactions
    .filter((t) => t.type === "expense" && t.status === "programado")
    .reduce((sum, t) => sum + t.amount, 0);
  const paidExpenses = filteredTransactions
    .filter((t) => t.type === "expense" && t.status === "efetivado")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalKmDriven = vehicles.reduce((total, vehicle) => {
    const vehicleFuelings = filteredFuelings
      .filter((f) => f.vehicle_id === vehicle.id)
      .sort((a, b) => a.odometer - b.odometer);

    if (vehicleFuelings.length >= 2) {
      const kmDriven = vehicleFuelings[vehicleFuelings.length - 1].odometer - vehicleFuelings[0].odometer;
      return total + kmDriven;
    }
    return total;
  }, 0);

  const expensesByCategory = categories
    .filter((c) => c.type === "expense")
    .map((cat) => ({
      name: cat.name,
      programado: filteredTransactions
        .filter((t) => t.type === "expense" && t.category_id === cat.id && t.status === "programado")
        .reduce((sum, t) => sum + t.amount, 0),
      efetivado: filteredTransactions
        .filter((t) => t.type === "expense" && t.category_id === cat.id && t.status === "efetivado")
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((item) => item.programado > 0 || item.efetivado > 0);

  const incomeByCategory = categories
    .filter((c) => c.type === "income")
    .map((cat) => ({
      name: cat.name,
      programado: filteredTransactions
        .filter((t) => t.type === "income" && t.category_id === cat.id && t.status === "programado")
        .reduce((sum, t) => sum + t.amount, 0),
      efetivado: filteredTransactions
        .filter((t) => t.type === "income" && t.category_id === cat.id && t.status === "efetivado")
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((item) => item.programado > 0 || item.efetivado > 0);

  const expensesByVehicle = vehicles
    .map((vehicle) => ({
      name: vehicle.name,
      value: filteredTransactions
        .filter((t) => t.type === "expense" && t.vehicle_id === vehicle.id)
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((item) => item.value > 0);

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgWidth = 190;
      const pageHeight = 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF("p", "mm", "a4");
      let position = 10;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`relatorio-${startDate}-a-${endDate}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setExporting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Layout userName="...">
        <div className="p-8">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout userName={user?.email || "Usuário"}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Relatório Detalhado</h2>
            <p className="text-muted-foreground">Análise completa do período selecionado</p>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Filtros e Exportação</CardTitle>
              <Button onClick={handleExportPDF} disabled={exporting} className="gap-2">
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Exportar PDF
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Data Início</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="endDate">Data Fim</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div ref={reportRef} className="space-y-6 bg-background p-6 rounded-lg">
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">Relatório Financeiro Detalhado</h2>
            <p className="text-muted-foreground">
              Período: {format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} até{" "}
              {format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Programado: {formatCurrency(scheduledIncome)} | Recebido: {formatCurrency(receivedIncome)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Programado: {formatCurrency(scheduledExpenses)} | Efetivado: {formatCurrency(paidExpenses)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(balance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Km Rodados: {totalKmDriven.toLocaleString("pt-BR")}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-success">
                Receitas ({filteredTransactions.filter((t) => t.type === "income").length})
              </h3>
              <div className="space-y-2">
                {filteredTransactions
                  .filter((t) => t.type === "income")
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((tx) => {
                    const category = categories.find((c) => c.id === tx.category_id);
                    const vehicle = vehicles.find((v) => v.id === tx.vehicle_id);
                    return (
                      <div key={tx.id} className="flex justify-between items-center p-3 bg-muted rounded-lg text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {category?.name} | {vehicle?.name} | {format(parseLocalDate(tx.date), "dd/MM/yyyy")} |{" "}
                            <span className={tx.status === "efetivado" ? "text-success" : "text-amber-500"}>
                              {tx.status === "efetivado" ? "Efetivado" : "Programado"}
                            </span>
                          </p>
                        </div>
                        <div className="font-bold text-success">{formatCurrency(tx.amount)}</div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-destructive">
                Despesas ({filteredTransactions.filter((t) => t.type === "expense").length})
              </h3>
              <div className="space-y-2">
                {filteredTransactions
                  .filter((t) => t.type === "expense")
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((tx) => {
                    const category = categories.find((c) => c.id === tx.category_id);
                    const vehicle = vehicles.find((v) => v.id === tx.vehicle_id);
                    return (
                      <div key={tx.id} className="flex justify-between items-center p-3 bg-muted rounded-lg text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {category?.name} | {vehicle?.name} | {format(parseLocalDate(tx.date), "dd/MM/yyyy")} |{" "}
                            <span className={tx.status === "efetivado" ? "text-destructive" : "text-amber-500"}>
                              {tx.status === "efetivado" ? "Efetivado" : "Programado"}
                            </span>
                          </p>
                        </div>
                        <div className="font-bold text-destructive">{formatCurrency(tx.amount)}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {expensesByCategory.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Despesas por Categoria</h3>
                <ChartContainer
                  config={{
                    programado: { label: "Programado", color: "#F59E0B" },
                    efetivado: { label: "Efetivado", color: "hsl(var(--destructive))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expensesByCategory} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                      <Legend />
                      <Bar dataKey="programado" stackId="a" fill="#F59E0B" name="Programado" />
                      <Bar dataKey="efetivado" stackId="a" fill="hsl(var(--destructive))" name="Efetivado" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}

            {incomeByCategory.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Receitas por Categoria</h3>
                <ChartContainer
                  config={{
                    programado: { label: "Programado", color: "#F59E0B" },
                    efetivado: { label: "Efetivado", color: "hsl(var(--success))" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeByCategory} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                      <Legend />
                      <Bar dataKey="programado" stackId="a" fill="#F59E0B" name="Programado" />
                      <Bar dataKey="efetivado" stackId="a" fill="hsl(var(--success))" name="Efetivado" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </div>

          {expensesByVehicle.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Despesas por Veículo</h3>
              <ChartContainer config={{}} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByVehicle}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesByVehicle.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Resumo Geral</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total de Transações</p>
                <p className="text-xl font-bold">{filteredTransactions.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Abastecimentos</p>
                <p className="text-xl font-bold">{filteredFuelings.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Km Rodados</p>
                <p className="text-xl font-bold">{totalKmDriven.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Custo/Km</p>
                <p className="text-xl font-bold">
                  {totalKmDriven > 0 ? formatCurrency(paidExpenses / totalKmDriven) : formatCurrency(0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DetailedReport;
