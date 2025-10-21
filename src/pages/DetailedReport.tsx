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
import { parseLocalDate, formatDateForInput } from "@/lib/dateUtils";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DetailedReport = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Usar any[] para acessar propriedades snake_case do Supabase
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fuelings, setFuelings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Configurar datas padrão (primeiro e último dia do mês atual)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(formatDateForInput(firstDay));
    setEndDate(formatDateForInput(lastDay));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/");
      return;
    }
    
    if (startDate && endDate) {
      fetchData();
    }
  }, [user, authLoading, navigate, startDate, endDate]);

  const fetchData = async () => {
    if (!user || !startDate || !endDate) return;

    try {
      setLoading(true);

      // Usar snake_case e filtrar no servidor
      const [transactionsRes, fuelingsRes, vehiclesRes, categoriesRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, vehicle_id, category_id, type, amount, description, date, status, payment_method")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false }),
        supabase
          .from("fuelings")
          .select("id, vehicle_id, liters, total_amount, odometer, date")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false }),
        supabase
          .from("vehicles")
          .select("id, name")
          .eq("user_id", user.id),
        supabase
          .from("categories")
          .select("id, name, type")
          .eq("user_id", user.id),
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

  // Separar transações por status
  const incomeEfetivadas = transactions.filter((t) => t.type === "income" && t.status === "efetivado");
  const incomeProgramadas = transactions.filter((t) => t.type === "income" && t.status === "programado");
  const expenseEfetivadas = transactions.filter((t) => t.type === "expense" && t.status === "efetivado");
  const expenseProgramadas = transactions.filter((t) => t.type === "expense" && t.status === "programado");

  // Calcular totais
  const totalIncomeEf = incomeEfetivadas.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalIncomePr = incomeProgramadas.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenseEf = expenseEfetivadas.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpensePr = expenseProgramadas.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalFueling = fuelings.reduce((sum, f) => sum + Number(f.total_amount), 0);

  const saldoEfetivado = totalIncomeEf - (totalExpenseEf + totalFueling);
  const saldoProjetado = (totalIncomeEf + totalIncomePr) - (totalExpenseEf + totalExpensePr + totalFueling);

  // Agrupar por categoria (apenas efetivadas)
  const expensesByCategory = categories
    .filter((c) => c.type === "expense")
    .map((category) => {
      const total = expenseEfetivadas
        .filter((t) => t.category_id === category.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const count = expenseEfetivadas.filter((t) => t.category_id === category.id).length;
      return { name: category.name, value: total, count };
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const incomeByCategory = categories
    .filter((c) => c.type === "income")
    .map((category) => {
      const total = incomeEfetivadas
        .filter((t) => t.category_id === category.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const count = incomeEfetivadas.filter((t) => t.category_id === category.id).length;
      return { name: category.name, value: total, count };
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  // Agrupar por veículo (apenas efetivadas)
  const expensesByVehicle = vehicles
    .map((vehicle) => {
      const transactionExpenses = expenseEfetivadas
        .filter((t) => t.vehicle_id === vehicle.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const fuelingExpenses = fuelings
        .filter((f) => f.vehicle_id === vehicle.id)
        .reduce((sum, f) => sum + Number(f.total_amount), 0);

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
        `Período: ${format(parseLocalDate(startDate), "dd/MM/yyyy", { locale: ptBR })} até ${format(parseLocalDate(endDate), "dd/MM/yyyy", { locale: ptBR })}`,
        margin,
        margin + 28
      );

      autoTable(doc, {
        startY: margin + 35,
        head: [["Descrição", "Valor"]],
        body: [
          ["Receitas Efetivadas", formatCurrency(totalIncomeEf)],
          ["Receitas Programadas", formatCurrency(totalIncomePr)],
          ["Despesas Efetivadas (Transações)", formatCurrency(totalExpenseEf)],
          ["Despesas Programadas (Transações)", formatCurrency(totalExpensePr)],
          ["Despesas (Abastecimentos)", formatCurrency(totalFueling)],
          ["Total Geral de Despesas", formatCurrency(totalExpenseEf + totalExpensePr + totalFueling)],
          ["Saldo Efetivado", formatCurrency(saldoEfetivado)],
          ["Saldo Projetado", formatCurrency(saldoProjetado)],
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
          0: { cellWidth: 120 },
          1: { halign: "right", cellWidth: 55 },
        },
        margin: { left: margin, right: margin },
      });

      addFooter();

      // PÁGINA 2: Receitas do Período
      doc.addPage();
      addHeader();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Receitas do Período", margin, margin + 20);

      let currentY = margin + 28;

      // Receitas Efetivadas
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Receitas Efetivadas", margin, currentY);
      currentY += 5;

      if (incomeEfetivadas.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhum registro no período.", margin, currentY + 3);
        currentY += 15;
      } else {
        const incomeEfData = incomeEfetivadas.map((t) => {
          const category = categories.find((c) => c.id === t.category_id);
          const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
          return [
            format(parseLocalDate(t.date), "dd/MM/yyyy", { locale: ptBR }),
            t.description || "-",
            category?.name || "-",
            vehicle?.name || "-",
            formatCurrency(Number(t.amount)),
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [["Data", "Descrição", "Categoria", "Veículo", "Valor"]],
          body: incomeEfData,
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
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { halign: "right", cellWidth: 30 },
          },
          margin: { left: margin, right: margin },
          foot: [["", "", "", "Total:", formatCurrency(totalIncomeEf)]],
          footStyles: {
            fillColor: [22, 163, 74],
            fontStyle: "bold",
            fontSize: 10,
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Receitas Programadas
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Receitas Programadas", margin, currentY);
      currentY += 5;

      if (incomeProgramadas.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhum registro no período.", margin, currentY + 3);
      } else {
        const incomePrData = incomeProgramadas.map((t) => {
          const category = categories.find((c) => c.id === t.category_id);
          const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
          return [
            format(parseLocalDate(t.date), "dd/MM/yyyy", { locale: ptBR }),
            t.description || "-",
            category?.name || "-",
            vehicle?.name || "-",
            formatCurrency(Number(t.amount)),
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [["Data", "Descrição", "Categoria", "Veículo", "Valor"]],
          body: incomePrData,
          theme: "striped",
          headStyles: {
            fillColor: [34, 197, 94],
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
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { halign: "right", cellWidth: 30 },
          },
          margin: { left: margin, right: margin },
          foot: [["", "", "", "Total:", formatCurrency(totalIncomePr)]],
          footStyles: {
            fillColor: [34, 197, 94],
            fontStyle: "bold",
            fontSize: 10,
          },
        });
      }

      addFooter();

      // PÁGINA 3: Despesas do Período (Transações)
      doc.addPage();
      addHeader();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Despesas do Período (Transações)", margin, margin + 20);

      currentY = margin + 28;

      // Despesas Efetivadas
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Despesas Efetivadas (Transações)", margin, currentY);
      currentY += 5;

      if (expenseEfetivadas.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhum registro no período.", margin, currentY + 3);
        currentY += 15;
      } else {
        const expenseEfData = expenseEfetivadas.map((t) => {
          const category = categories.find((c) => c.id === t.category_id);
          const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
          return [
            format(parseLocalDate(t.date), "dd/MM/yyyy", { locale: ptBR }),
            t.description || "-",
            category?.name || "-",
            vehicle?.name || "-",
            formatCurrency(Number(t.amount)),
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [["Data", "Descrição", "Categoria", "Veículo", "Valor"]],
          body: expenseEfData,
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
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { halign: "right", cellWidth: 30 },
          },
          margin: { left: margin, right: margin },
          foot: [["", "", "", "Total:", formatCurrency(totalExpenseEf)]],
          footStyles: {
            fillColor: [220, 38, 38],
            fontStyle: "bold",
            fontSize: 10,
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Despesas Programadas
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Despesas Programadas (Transações)", margin, currentY);
      currentY += 5;

      if (expenseProgramadas.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhum registro no período.", margin, currentY + 3);
      } else {
        const expensePrData = expenseProgramadas.map((t) => {
          const category = categories.find((c) => c.id === t.category_id);
          const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
          return [
            format(parseLocalDate(t.date), "dd/MM/yyyy", { locale: ptBR }),
            t.description || "-",
            category?.name || "-",
            vehicle?.name || "-",
            formatCurrency(Number(t.amount)),
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [["Data", "Descrição", "Categoria", "Veículo", "Valor"]],
          body: expensePrData,
          theme: "striped",
          headStyles: {
            fillColor: [239, 68, 68],
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
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { halign: "right", cellWidth: 30 },
          },
          margin: { left: margin, right: margin },
          foot: [["", "", "", "Total:", formatCurrency(totalExpensePr)]],
          footStyles: {
            fillColor: [239, 68, 68],
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

      const fuelingData = fuelings.map((f) => {
        const vehicle = vehicles.find((v) => v.id === f.vehicle_id);
        const pricePerLiter = Number(f.total_amount) / Number(f.liters);
        return [
          format(parseLocalDate(f.date), "dd/MM/yyyy", { locale: ptBR }),
          vehicle?.name || "-",
          Number(f.liters).toFixed(2) + " L",
          formatCurrency(pricePerLiter),
          f.odometer ? f.odometer.toString() + " km" : "-",
          formatCurrency(Number(f.total_amount)),
        ];
      });

      if (fuelingData.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhum registro no período.", margin, margin + 30);
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
          margin: { left: margin, right: margin },
          foot: [["", "", "", "", "Total:", formatCurrency(totalFueling)]],
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

      currentY = margin + 28;

      // Receitas por Categoria
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Receitas por Categoria", margin, currentY);
      currentY += 5;

      if (incomeByCategory.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("Nenhum registro no período.", margin, currentY + 3);
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
        doc.text("Nenhum registro no período.", margin, currentY + 3);
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
        doc.text("Nenhum registro no período.", margin, margin + 30);
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
          margin: { left: margin, right: margin },
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
