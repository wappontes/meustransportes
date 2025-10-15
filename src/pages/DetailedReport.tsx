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
        width: 800,
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 190;
      const pageHeight = 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
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

          <div ref={reportRef} className="space-y-4 bg-white p-6 rounded-lg max-w-[800px] mx-auto text-gray-900">
            <div className="text-center border-b border-gray-300 pb-3">
              <h2 className="text-xl font-bold text-gray-900">Relatório Financeiro Detalhado</h2>
              <p className="text-sm text-gray-600">
                Período: {format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} até{" "}
                {format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="border border-gray-200 rounded p-3 bg-white">
                <div className="text-xs font-medium text-gray-600 mb-1">Total Receitas</div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Prog: {formatCurrency(scheduledIncome)} | Rec: {formatCurrency(receivedIncome)}
                </p>
              </div>

              <div className="border border-gray-200 rounded p-3 bg-white">
                <div className="text-xs font-medium text-gray-600 mb-1">Total Despesas</div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Prog: {formatCurrency(scheduledExpenses)} | Efet: {formatCurrency(paidExpenses)}
                </p>
              </div>

              <div className="border border-gray-200 rounded p-3 bg-white">
                <div className="text-xs font-medium text-gray-600 mb-1">Saldo</div>
                <div className={`text-lg font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(balance)}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Km: {totalKmDriven.toLocaleString("pt-BR")}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-green-700">
                  Receitas ({filteredTransactions.filter((t) => t.type === "income").length})
                </h3>
                <div className="space-y-1">
                  {filteredTransactions
                    .filter((t) => t.type === "income")
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((tx) => {
                      const category = categories.find((c) => c.id === tx.category_id);
                      const vehicle = vehicles.find((v) => v.id === tx.vehicle_id);
                      return (
                        <div key={tx.id} className="flex justify-between items-start gap-2 p-2 bg-gray-50 rounded text-xs border border-gray-200">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{tx.description}</p>
                            <p className="text-[10px] text-gray-600">
                              {category?.name} | {vehicle?.name} | {format(parseLocalDate(tx.date), "dd/MM/yyyy")} |{" "}
                              <span className={tx.status === "efetivado" ? "text-green-600" : "text-amber-600"}>
                                {tx.status === "efetivado" ? "Efet." : "Prog."}
                              </span>
                            </p>
                          </div>
                          <div className="font-bold text-green-600 whitespace-nowrap">{formatCurrency(tx.amount)}</div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-red-700">
                  Despesas ({filteredTransactions.filter((t) => t.type === "expense").length})
                </h3>
                <div className="space-y-1">
                  {filteredTransactions
                    .filter((t) => t.type === "expense")
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((tx) => {
                      const category = categories.find((c) => c.id === tx.category_id);
                      const vehicle = vehicles.find((v) => v.id === tx.vehicle_id);
                      return (
                        <div key={tx.id} className="flex justify-between items-start gap-2 p-2 bg-gray-50 rounded text-xs border border-gray-200">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{tx.description}</p>
                            <p className="text-[10px] text-gray-600">
                              {category?.name} | {vehicle?.name} | {format(parseLocalDate(tx.date), "dd/MM/yyyy")} |{" "}
                              <span className={tx.status === "efetivado" ? "text-red-600" : "text-amber-600"}>
                                {tx.status === "efetivado" ? "Efet." : "Prog."}
                              </span>
                            </p>
                          </div>
                          <div className="font-bold text-red-600 whitespace-nowrap">{formatCurrency(tx.amount)}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {expensesByCategory.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-900">Despesas por Categoria</h3>
                  <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expensesByCategory} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 9 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="programado" stackId="a" fill="#F59E0B" name="Prog." />
                        <Bar dataKey="efetivado" stackId="a" fill="#DC2626" name="Efet." />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {incomeByCategory.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-900">Receitas por Categoria</h3>
                  <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeByCategory} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 9 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="programado" stackId="a" fill="#F59E0B" name="Prog." />
                        <Bar dataKey="efetivado" stackId="a" fill="#10B981" name="Efet." />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          {expensesByVehicle.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-900">Despesas por Veículo</h3>
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByVehicle}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      style={{ fontSize: 10 }}
                    >
                      {expensesByVehicle.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="border-t border-gray-300 pt-3 mt-4">
            <h3 className="text-sm font-bold mb-2 text-gray-900">Resumo Geral</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="space-y-1">
                <p className="flex justify-between">
                  <span className="text-gray-600">Total Receitas:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(totalIncome)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Rec. Programadas:</span>
                  <span className="font-medium text-amber-600">{formatCurrency(scheduledIncome)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Rec. Efetivadas:</span>
                  <span className="font-medium text-green-600">{formatCurrency(receivedIncome)}</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="flex justify-between">
                  <span className="text-gray-600">Total Despesas:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Desp. Programadas:</span>
                  <span className="font-medium text-amber-600">{formatCurrency(scheduledExpenses)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Desp. Efetivadas:</span>
                  <span className="font-medium text-red-600">{formatCurrency(paidExpenses)}</span>
                </p>
              </div>
              <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
                <div className="grid grid-cols-2 gap-1">
                  <p className="flex justify-between">
                    <span className="font-semibold text-gray-900">Saldo Final:</span>
                    <span className={`font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(balance)}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Km Rodados:</span>
                    <span className="font-medium text-gray-900">{totalKmDriven.toLocaleString("pt-BR")} km</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Total Transações:</span>
                    <span className="font-medium text-gray-900">{filteredTransactions.length}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-600">Custo/Km:</span>
                    <span className="font-medium text-gray-900">
                      {totalKmDriven > 0 ? formatCurrency(paidExpenses / totalKmDriven) : formatCurrency(0)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DetailedReport;
