import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Transaction, Vehicle, Category } from "@/types";
import { Plus, Receipt, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { parseLocalDate, formatDateForInput } from "@/lib/dateUtils";

const transactionSchema = z.object({
  vehicleId: z.string().min(1, "Selecione um veículo"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  description: z.string().trim().max(200, "Descrição muito longa"),
  date: z.string().min(1, "Data é obrigatória"),
});

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("transactions", []);
  const [vehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [categories] = useLocalStorage<Category[]>("categories", []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("income");

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
      navigate("/");
    } else {
      setUser(JSON.parse(currentUser));
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const data = transactionSchema.parse({
        vehicleId: formData.get("vehicleId"),
        categoryId: formData.get("categoryId"),
        amount: formData.get("amount"),
        description: formData.get("description"),
        date: formData.get("date"),
      });

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        userId: user.id,
        vehicleId: data.vehicleId,
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.description,
        date: data.date,
        type: transactionType,
        createdAt: new Date().toISOString(),
      };
      
      setTransactions([...transactions, newTransaction]);
      toast({ title: `${transactionType === "income" ? "Receita" : "Despesa"} registrada com sucesso!` });
      setIsDialogOpen(false);
      e.currentTarget.reset();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
    toast({ title: "Transação removida com sucesso!" });
  };

  if (!user) return null;

  const userVehicles = vehicles.filter(v => v.userId === user.id);
  const userCategories = categories.filter(c => c.userId === user.id);
  const userTransactions = transactions.filter(t => t.userId === user.id).sort((a, b) => 
    parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
  );

  const filteredCategories = userCategories.filter(c => c.type === transactionType);

  return (
    <Layout userName={user.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Transações</h2>
            <p className="text-muted-foreground">Registre receitas e despesas</p>
          </div>
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
                      {userVehicles.map(v => (
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
              const vehicle = userVehicles.find(v => v.id === transaction.vehicleId);
              const category = userCategories.find(c => c.id === transaction.categoryId);
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseLocalDate(transaction.date), "dd/MM/yyyy")}
                          </p>
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
