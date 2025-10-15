import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import type { Plan } from "@/types";

const Plans = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }
    if (user) {
      fetchPlans();
    }
  }, [user, authLoading, navigate]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("quantity", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: "Erro ao carregar planos",
        description: "Não foi possível carregar os planos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const description = formData.get("description") as string;
    const quantity = parseInt(formData.get("quantity") as string);
    const value = parseFloat(formData.get("value") as string);

    try {
      if (editingPlan) {
        const { error } = await supabase
          .from("plans")
          .update({ description, quantity, value })
          .eq("id", editingPlan.id);

        if (error) throw error;
        toast({ title: "Plano atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from("plans")
          .insert({ description, quantity, value });

        if (error) throw error;
        toast({ title: "Plano criado com sucesso!" });
      }

      setDialogOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Erro ao salvar plano",
        description: "Não foi possível salvar o plano.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;

    try {
      const { error } = await supabase.from("plans").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Plano excluído com sucesso!" });
      fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Erro ao excluir plano",
        description: "Não foi possível excluir o plano.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlan(null);
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Planos</h2>
            <p className="text-muted-foreground">Gerencie os planos disponíveis</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPlan(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    name="description"
                    defaultValue={editingPlan?.description}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade de Veículos</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue={editingPlan?.quantity}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingPlan?.value}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingPlan ? "Atualizar" : "Criar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Planos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Quantidade de Veículos</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.description}</TableCell>
                    <TableCell>{plan.quantity}</TableCell>
                    <TableCell>{formatCurrency(plan.value)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(plan)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Plans;
