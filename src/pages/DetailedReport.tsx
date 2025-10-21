import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { Vehicle, Category, Transaction, Fueling } from "@/types";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DetailedReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fuelings, setFuelings] = useState<Fueling[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Configurar datas padrão (primeiro e último dia do mês atual)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [transactionsRes, fuelingsRes, vehiclesRes, categoriesRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("userId", user.id).order("date", { ascending: false }),
        supabase.from("fuelings").select("*").eq("userId", user.id).order("date", { ascending: false }),
        supabase.from("vehicles").select("*").eq("userId", user.id),
        supabase.from("categories").select("*").eq("userId", user.id),
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
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar dados pelo período
  const filteredTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= new Date(startDate) && tDate <= new Date(endDate);
  });

  const filteredFuelings = fuelings.filter((f) => {
    const fDate = new Date(f.date);
    return fDate >= new Date(startDate) && fDate <= new Date(endDate);
  });

  // Calcular totais
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFuelingExpenses = filteredFuelings.reduce((sum, f) => sum + f.totalAmount, 0);

  const balance = totalIncome - (totalExpenses + totalFuelingExpenses);

  // Agrupar por categoria
  const expensesByCategory = categories
    .filter((c) => c.type === "expense")
    .map((category) => {
      const total = filteredTransactions
        .filter((t) => t.categoryId === category.id && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: category.name, value: total, count: filteredTransactions.filter((t) => t.categoryId === category.id).length };
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const incomeByCategory = categories
    .filter((c) => c.type === "income")
    .map((category) => {
      const total = filteredTransactions
        .filter((t) => t.categoryId === category.id && t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: category.name, value: total, count: filteredTransactions.filter((t) => t.categoryId === category.id).length };
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  // Agrupar por veículo
  const expensesByVehicle = vehicles
    .map((vehicle) => {
      const transactionExpenses = filteredTransactions
        .filter((t) => t.vehicleId === vehicle.id && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const fuelingExpenses = filteredFuelings
        .filter((f) => f.vehicleId === vehicle.id)
        .reduce((sum, f) => sum + f.totalAmount, 0);

      return {
        name: vehicle.name,
        expenses: transactionExpenses,
        fuelings: fuelingExpenses,
        total: transactionExpenses + fuelingExpenses,
      };
    })
    .filter((v) => v.total > 0)
    .sort((a, b) => b.total - a.total);

  const generatePDF = async () => {
    try {
      setExporting(true);

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      const userName = user?.email?.split("@")[0] || "Usuário";
      const currentDate = new Date();
      const generationDateTime = format(currentDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      let pageNumber = 1;

      // Função para adicionar cabeçalho
      const addHeader = () => {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Meus Transportes", margin, margin + 5);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(format(currentDate, "dd/MM/yyyy", { locale: ptBR }), pageWidth - margin - 25, margin + 5);

        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, margin + 8, pageWidth - margin, margin + 8);
      };

      // Função para adicionar rodapé
      const addFooter = () => {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);

        doc.text(
          "Relatório gerado automaticamente pelo sistema Meus Transportes",
          pageWidth / 2,
          pageHeight - margin - 8,
          { align: "center" }
        );

        doc.text(
          `${generationDateTime} - Usuário: ${userName}`,
          pageWidth / 2,
          pageHeight - margin - 4,
          { align: "center" }
        );

        doc.text(`Página ${pageNumber}`, pageWidth - margin - 10, pageHeight - margin - 4, { align: "right" });

        doc.setTextColor(0, 0, 0);
        pageNumber++;
      };

      // PÁGINA 1: Resumo Financeiro
      addHeader();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório Financeiro Detalhado", margin, margin + 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Período: ${format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} até ${format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}`,
        margin,
        margin + 28
      );

      autoTable(doc, {
        startY: margin + 35,
        head: [["Descrição", "Valor"]],
        body: [
          ["Total de Receitas", formatCurrency(totalIncome)],
          ["Total de Despesas (Transações)", formatCurrency(totalExpenses)],
          ["Total de Despesas (Abastecimentos)", formatCurrency(totalFuelingExpenses)],
          ["Total Geral de Despesas", formatCurrency(totalExpenses + totalFuelingExpenses)],
          ["Saldo do Período", formatCurrency(balance)],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [37, 99, 235],
          fontSize: 11,
          fontStyle: "bold",
          halign: "center",
        },
        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { halign: "right", cellWidth: 70 },
        },
        margin: { left: margin, right: margin },
      });

      addFooter();

      // PÁGINA 2: Receitas Detalhadas
      doc.addPage();
      addHeader();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Receitas do Período", margin, margin + 20);

      const incomeTransactions = filteredTransactions.filter((t) => t.type === "income");

      const incomeData = incomeTransactions.map((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        const vehicle = vehicles.find((v) => v.id === t.vehicleId);
        return [
          format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR }),
          t.description || "-",
          category?.name || "-",
          vehicle?.name || "-",
          formatCurrency(t.amount),
        ];
      });

      if (incomeData.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhuma receita registrada no período.", margin, margin + 30);
      } else {
        autoTable(doc, {
          startY: margin + 25,
          head: [["Data", "Descrição", "Categoria", "Veículo", "Valor"]],
          body: incomeData,
          theme: "striped",
          headStyles: {
            fillColor: [22, 163, 74],
            fontSize: 10,
            fontStyle: "bold",
          },
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 50 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { halign: "right", cellWidth: 30 },
          },
          margin: { left: margin, right: margin, bottom: margin + 15 },
          foot: [["", "", "", "Total:", formatCurrency(totalIncome)]],
          footStyles: {
            fillColor: [22, 163, 74],
            fontStyle: "bold",
            fontSize: 10,
          },
        });
      }

      addFooter();

      // PÁGINA 3: Despesas Detalhadas
      doc.addPage();
      addHeader();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Despesas do Período (Transações)", margin, margin + 20);

      const expenseTransactions = filteredTransactions.filter((t) => t.type === "expense");

      const expenseData = expenseTransactions.map((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        const vehicle = vehicles.find((v) => v.id === t.vehicleId);
        return [
          format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR }),
          t.description || "-",
          category?.name || "-",
          vehicle?.name || "-",
          formatCurrency(t.amount),
        ];
      });

      if (expenseData.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhuma despesa registrada no período.", margin, margin + 30);
      } else {
        autoTable(doc, {
          startY: margin + 25,
          head: [["Data", "Descrição", "Categoria", "Veículo", "Valor"]],
          body: expenseData,
          theme: "striped",
          headStyles: {
            fillColor: [220, 38, 38],
            fontSize: 10,
            fontStyle: "bold",
          },
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 50 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { halign: "right", cellWidth: 30 },
          },
          margin: { left: margin, right: margin, bottom: margin + 15 },
          foot: [["", "", "", "Total:", formatCurrency(totalExpenses)]],
          footStyles: {
            fillColor: [220, 38, 38],
            fontStyle: "bold",
            fontSize: 10,
          },
        });
      }

      addFooter();

      // PÁGINA 4: Abastecimentos
      doc.addPage();
      addHeader();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Abastecimentos do Período", margin, margin + 20);

      const fuelingData = filteredFuelings.map((f) => {
        const vehicle = vehicles.find((v) => v.id === f.vehicleId);
        const pricePerLiter = f.totalAmount / f.liters;
        return [
          format(new Date(f.date), "dd/MM/yyyy", { locale: ptBR }),
          vehicle?.name || "-",
          f.liters.toFixed(2) + " L",
          formatCurrency(pricePerLiter),
          f.odometer?.toString() + " km" || "-",
          formatCurrency(f.totalAmount),
        ];
      });

      if (fuelingData.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhum abastecimento registrado no período.", margin, margin + 30);
      } else {
        autoTable(doc, {
          startY: margin + 25,
          head: [["Data", "Veículo", "Litros", "Preço/Litro", "Km", "Total"]],
          body: fuelingData,
          theme: "striped",
          headStyles: {
            fillColor: [245, 158, 11],
            fontSize: 10,
            fontStyle: "bold",
          },
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 40 },
            2: { halign: "right", cellWidth: 25 },
            3: { halign: "right", cellWidth: 28 },
            4: { halign: "right", cellWidth: 25 },
            5: { halign: "right", cellWidth: 32 },
          },
          margin: { left: margin, right: margin, bottom: margin + 15 },
          foot: [["", "", "", "", "Total:", formatCurrency(totalFuelingExpenses)]],
          footStyles: {
            fillColor: [245, 158, 11],
            fontStyle: "bold",
            fontSize: 10,
          },
        });
      }

      addFooter();

      // PÁGINA 5: Análise por Categoria
      doc.addPage();
      addHeader();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo por Categoria", margin, margin + 20);

      let currentY = margin + 28;

      // Receitas por Categoria
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Receitas por Categoria", margin, currentY);
      currentY += 5;

      if (incomeByCategory.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhuma receita por categoria no período.", margin, currentY + 3);
        currentY += 15;
      } else {
        const incomeCategoryData = incomeByCategory.map((c) => [c.name, c.count.toString(), formatCurrency(c.value)]);

        autoTable(doc, {
          startY: currentY,
          head: [["Categoria", "Quantidade", "Total"]],
          body: incomeCategoryData,
          theme: "grid",
          headStyles: {
            fillColor: [22, 163, 74],
            fontSize: 10,
            fontStyle: "bold",
          },
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: "center", cellWidth: 35 },
            2: { halign: "right", cellWidth: 50 },
          },
          margin: { left: margin, right: margin },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Despesas por Categoria
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Despesas por Categoria", margin, currentY);
      currentY += 5;

      if (expensesByCategory.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhuma despesa por categoria no período.", margin, currentY + 3);
      } else {
        const expenseCategoryData = expensesByCategory.map((c) => [c.name, c.count.toString(), formatCurrency(c.value)]);

        autoTable(doc, {
          startY: currentY,
          head: [["Categoria", "Quantidade", "Total"]],
          body: expenseCategoryData,
          theme: "grid",
          headStyles: {
            fillColor: [220, 38, 38],
            fontSize: 10,
            fontStyle: "bold",
          },
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: "center", cellWidth: 35 },
            2: { halign: "right", cellWidth: 50 },
          },
          margin: { left: margin, right: margin },
        });
      }

      addFooter();

      // PÁGINA 6: Análise por Veículo
      doc.addPage();
      addHeader();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo por Veículo", margin, margin + 20);

      if (expensesByVehicle.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhuma despesa por veículo no período.", margin, margin + 30);
      } else {
        const vehicleData = expensesByVehicle.map((v) => [
          v.name,
          formatCurrency(v.expenses),
          formatCurrency(v.fuelings),
          formatCurrency(v.total),
        ]);

        autoTable(doc, {
          startY: margin + 25,
          head: [["Veículo", "Despesas", "Abastecimentos", "Total"]],
          body: vehicleData,
          theme: "grid",
          headStyles: {
            fillColor: [37, 99, 235],
            fontSize: 10,
            fontStyle: "bold",
          },
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { halign: "right", cellWidth: 40 },
            2: { halign: "right", cellWidth: 40 },
            3: { halign: "right", cellWidth: 40 },
          },
          margin: { left: margin, right: margin, bottom: margin + 15 },
          foot: [
            [
              "Total Geral:",
              formatCurrency(expensesByVehicle.reduce((sum, v) => sum + v.expenses, 0)),
              formatCurrency(expensesByVehicle.reduce((sum, v) => sum + v.fuelings, 0)),
              formatCurrency(expensesByVehicle.reduce((sum, v) => sum + v.total, 0)),
            ],
          ],
          footStyles: {
            fillColor: [37, 99, 235],
            fontStyle: "bold",
            fontSize: 10,
          },
        });
      }

      addFooter();

      // Salvar PDF
      const fileName = `relatorio_${format(currentDate, "yyyy-MM-dd_HHmmss")}.pdf`;
      doc.save(fileName);

      toast({
        title: "Sucesso",
        description: "PDF gerado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao gerar o relatório PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-4">
        <h1 className="text-3xl font-bold mb-6">Relatório Detalhado</h1>

        <Card>
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
                <Button onClick={generatePDF} disabled={exporting} className="w-full">
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
    </Layout>
  );
};

export default DetailedReport;
