import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Receipt, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, formatDateForInput } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const transactionSchema = z.object({
  vehicleId: z.string().min(1, "Selecione um veículo"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  description: z.string().trim().max(200, "Descrição muito longa"),
  date: z.string().min(1, "Data é obrigatória"),
  paymentMethod: z.string().min(1, "Selecione a forma de pagamento"),
  status: z.string().min(1, "Selecione o status"),
});

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("income");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
      const [transactionsRes, vehiclesRes, categoriesRes] = await Promise.all([
        supabase.from("transactions").select("*").order("date", { ascending: false }),
        supabase.from("vehicles").select("*"),
        supabase.from("categories").select("*"),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setTransactions(transactionsRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      const data = transactionSchema.parse({
        vehicleId: formData.get("vehicleId"),
        categoryId: formData.get("categoryId"),
        amount: formData.get("amount"),
        description: formData.get("description"),
        date: formData.get("date"),
        paymentMethod: formData.get("paymentMethod"),
        status: formData.get("status"),
      });

      const { error } = await supabase
        .from("transactions")
        .insert([{
          user_id: user!.id,
          vehicle_id: data.vehicleId,
          category_id: data.categoryId,
          amount: data.amount,
          description: data.description,
          date: data.date,
          type: transactionType,
          payment_method: data.paymentMethod,
          status: data.status,
        }]);

      if (error) throw error;

      toast({ title: `${transactionType === "income" ? "Receita" : "Despesa"} registrada com sucesso!` });
      setIsDialogOpen(false);
      form.reset();
      await fetchData();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error saving transaction:", error);
        toast({
          title: "Erro ao salvar transação",
          description: "Tente novamente mais tarde",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Transação removida com sucesso!" });
      await fetchData();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Erro ao remover transação",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };

  if (loading || authLoading) {
    return <Layout userName="..."><div className="p-8">Carregando...</div></Layout>;
  }

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  
  const userTransactions = transactions
    .filter(t => {
      const matchesVehicle = selectedVehicleId === "all" || t.vehicle_id === selectedVehicleId;
      const matchesMonth = isWithinInterval(parseLocalDate(t.date), { start: monthStart, end: monthEnd });
      return matchesVehicle && matchesMonth;
    })
    .sort((a, b) => 
      parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
    );

  const filteredCategories = categories.filter(c => c.type === transactionType);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date.toISOString(),
      label: format(date, "MMMM 'de' yyyy", { locale: ptBR })
    };
  });

  return (
    <Layout userName={user?.email || "Usuário"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Transações</h2>
            <p className="text-muted-foreground">Registre receitas e despesas</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={selectedVehicleId}
              onValueChange={setSelectedVehicleId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedDate.toISOString()}
              onValueChange={(value) => setSelectedDate(new Date(value))}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue>
                  {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
                <DialogDescription>
                  Registre uma receita ou despesa
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={transactionType === "income" ? "default" : "outline"}
                      onClick={() => setTransactionType("income")}
                      className="flex-1"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Receita
                    </Button>
                    <Button
                      type="button"
                      variant={transactionType === "expense" ? "default" : "outline"}
                      onClick={() => setTransactionType("expense")}
                      className="flex-1"
                    >
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Despesa
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleId">Veículo</Label>
                  <Select name="vehicleId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name} - {v.plate}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Categoria</Label>
                  <Select name="categoryId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input id="date" name="date" type="date" defaultValue={formatDateForInput(new Date())} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <Select name="paymentMethod" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Crédito">Crédito</SelectItem>
                      <SelectItem value="Débito">Débito</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" required defaultValue="efetivado">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programado">Programado</SelectItem>
                      <SelectItem value="efetivado">Efetivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea id="description" name="description" placeholder="Ex: Frete para São Paulo" />
                </div>

                <Button type="submit" className="w-full">
                  Registrar Transação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {userTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma transação registrada. Adicione sua primeira transação!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {userTransactions.map((transaction) => {
              const vehicle = vehicles.find(v => v.id === transaction.vehicle_id);
              const category = categories.find(c => c.id === transaction.category_id);
              const isIncome = transaction.type === "income";

              return (
                <Card key={transaction.id} className="shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isIncome ? "bg-success/10" : "bg-destructive/10"
                        }`}>
                          {isIncome ? (
                            <TrendingUp className="w-5 h-5 text-success" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{category?.name}</h3>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{vehicle?.name}</span>
                          </div>
                          {transaction.description && (
                            <p className="text-sm text-muted-foreground">{transaction.description}</p>
                          )}
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span>{format(parseLocalDate(transaction.date), "dd/MM/yyyy")}</span>
                            {transaction.payment_method && (
                              <>
                                <span>•</span>
                                <span>{transaction.payment_method}</span>
                              </>
                            )}
                            {transaction.status && (
                              <>
                                <span>•</span>
                                <span className={transaction.status === "programado" ? "text-amber-500" : "text-success"}>
                                  {transaction.status === "programado" ? "Programado" : "Efetivado"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${
                          isIncome ? "text-success" : "text-destructive"
                        }`}>
                          {isIncome ? "+" : "-"} R$ {transaction.amount.toFixed(2)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Transactions;
