import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Transaction, Fueling, Vehicle, Category } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function DetailedReport() {
  const { user, loading: authLoading } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fuelings, setFuelings] = useState<Fueling[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);
  const page4Ref = useRef<HTMLDivElement>(null);
  const page5Ref = useRef<HTMLDivElement>(null);
  const page6Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/";
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [transactionsData, fuelingsData, vehiclesData, categoriesData] = await Promise.all([
        supabase.from("transactions").select("*").eq("userId", user.id),
        supabase.from("fuelings").select("*").eq("userId", user.id),
        supabase.from("vehicles").select("*").eq("userId", user.id),
        supabase.from("categories").select("*").eq("userId", user.id),
      ]);

      setTransactions(transactionsData.data || []);
      setFuelings(fuelingsData.data || []);
      setVehicles(vehiclesData.data || []);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!startDate || !endDate) return true;
    const transDate = new Date(t.date);
    return transDate >= new Date(startDate) && transDate <= new Date(endDate);
  });

  const filteredFuelings = fuelings.filter((f) => {
    if (!startDate || !endDate) return true;
    const fuelDate = new Date(f.date);
    return fuelDate >= new Date(startDate) && fuelDate <= new Date(endDate);
  });

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFuelingExpenses = filteredFuelings.reduce((sum, f) => sum + f.totalAmount, 0);
  const balance = totalIncome - (totalExpenses + totalFuelingExpenses);

  // Calcular despesas por categoria
  const expensesByCategory = categories
    .filter((c) => c.type === "expense")
    .map((category) => {
      const total = filteredTransactions
        .filter((t) => t.categoryId === category.id && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: category.name, value: total };
    })
    .filter((item) => item.value > 0);

  // Calcular receitas por categoria
  const incomeByCategory = categories
    .filter((c) => c.type === "income")
    .map((category) => {
      const total = filteredTransactions
        .filter((t) => t.categoryId === category.id && t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: category.name, value: total };
    })
    .filter((item) => item.value > 0);

  // Calcular despesas por veículo
  const expensesByVehicle = vehicles.map((vehicle) => {
    const transactionTotal = filteredTransactions
      .filter((t) => t.vehicleId === vehicle.id && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const fuelingTotal = filteredFuelings
      .filter((f) => f.vehicleId === vehicle.id)
      .reduce((sum, f) => sum + f.totalAmount, 0);
    
    return { name: vehicle.name, value: transactionTotal + fuelingTotal };
  }).filter((item) => item.value > 0);

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      toast({
        title: "Gerando PDF",
        description: "Por favor, aguarde...",
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;

      const refs = [page1Ref, page2Ref, page3Ref, page4Ref, page5Ref, page6Ref];
      
      for (let i = 0; i < refs.length; i++) {
        const element = refs[i].current;
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 800,
          windowWidth: 800,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", margin, margin, imgWidth, Math.min(imgHeight, pageHeight - 2 * margin));
      }

      pdf.save(`relatorio-detalhado-${new Date().toISOString().split("T")[0]}.pdf`);

      toast({
        title: "Sucesso",
        description: "PDF gerado com sucesso!",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Relatório Detalhado</h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Selecione o período do relatório</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleExportPDF} disabled={exporting} className="w-full">
                    {exporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hidden pages for PDF export */}
        <div className="hidden">
          {/* Page 1: Summary */}
          <div ref={page1Ref} className="w-[800px] bg-white p-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Relatório Financeiro Detalhado</h1>
            <p className="text-sm text-gray-600 mb-6">
              Período: {startDate ? new Date(startDate).toLocaleDateString() : "Início"} até{" "}
              {endDate ? new Date(endDate).toLocaleDateString() : "Hoje"}
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded">
                <p className="text-sm text-gray-600">Total de Receitas</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded">
                <p className="text-sm text-gray-600">Total de Despesas</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(totalExpenses + totalFuelingExpenses)}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-gray-600">Saldo</p>
                <p className={`text-xl font-bold ${balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Detalhamento de Despesas</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Transações:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Abastecimentos:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(totalFuelingExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2: Income List */}
          <div ref={page2Ref} className="w-[800px] bg-white p-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Receitas Detalhadas</h2>
            <div className="space-y-2">
              {filteredTransactions
                .filter((t) => t.type === "income")
                .slice(0, 15)
                .map((transaction) => {
                  const category = categories.find((c) => c.id === transaction.categoryId);
                  const vehicle = vehicles.find((v) => v.id === transaction.vehicleId);
                  return (
                    <div key={transaction.id} className="flex justify-between items-center p-2 border-b text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-xs text-gray-600">
                          {category?.name} • {vehicle?.name} • {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-bold text-green-600">{formatCurrency(transaction.amount)}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Page 3: Expenses List */}
          <div ref={page3Ref} className="w-[800px] bg-white p-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Despesas Detalhadas</h2>
            <div className="space-y-2">
              {filteredTransactions
                .filter((t) => t.type === "expense")
                .slice(0, 15)
                .map((transaction) => {
                  const category = categories.find((c) => c.id === transaction.categoryId);
                  const vehicle = vehicles.find((v) => v.id === transaction.vehicleId);
                  return (
                    <div key={transaction.id} className="flex justify-between items-center p-2 border-b text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-xs text-gray-600">
                          {category?.name} • {vehicle?.name} • {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-bold text-red-600">{formatCurrency(transaction.amount)}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Page 4: Expenses by Category */}
          <div ref={page4Ref} className="w-[800px] bg-white p-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Despesas por Categoria</h2>
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={expensesByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-600">Nenhuma despesa encontrada no período</p>
            )}
          </div>

          {/* Page 5: Income by Category */}
          <div ref={page5Ref} className="w-[800px] bg-white p-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Receitas por Categoria</h2>
            {incomeByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={incomeByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-600">Nenhuma receita encontrada no período</p>
            )}
          </div>

          {/* Page 6: Expenses by Vehicle */}
          <div ref={page6Ref} className="w-[800px] bg-white p-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Despesas por Veículo</h2>
            {expensesByVehicle.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={expensesByVehicle}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-600">Nenhuma despesa de veículo encontrada no período</p>
            )}
          </div>
        </div>

        {/* Visible preview */}
        <Card>
          <CardHeader>
            <CardTitle>Visualização do Relatório</CardTitle>
            <CardDescription>
              O relatório será exportado em 6 páginas separadas para garantir que nenhum conteúdo seja cortado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-100 p-4 rounded">
                <p className="text-sm text-gray-700">Total de Receitas</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="bg-red-100 p-4 rounded">
                <p className="text-sm text-gray-700">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(totalExpenses + totalFuelingExpenses)}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded md:col-span-2">
                <p className="text-sm text-gray-700">Saldo</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? "text-blue-700" : "text-red-700"}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
