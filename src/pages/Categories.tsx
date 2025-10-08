import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, TrendingDown, Trash2, Edit } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(50),
});

const Categories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryType, setCategoryType] = useState<"income" | "expense">("income");
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }
    if (user) {
      fetchCategories();
    }
  }, [user, authLoading, navigate]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Erro ao carregar categorias",
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
      const data = categorySchema.parse({
        name: formData.get("name"),
      });

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({ ...data, user_id: user!.id })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast({ title: "Categoria atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([{ ...data, type: categoryType, user_id: user!.id }]);

        if (error) throw error;
        toast({ title: "Categoria cadastrada com sucesso!" });
      }

      setIsDialogOpen(false);
      setEditingCategory(null);
      form.reset();
      await fetchCategories();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error saving category:", error);
        toast({
          title: "Erro ao salvar categoria",
          description: "Tente novamente mais tarde",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Categoria removida com sucesso!" });
      await fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Erro ao remover categoria",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setCategoryType(category.type);
    setIsDialogOpen(true);
  };

  if (loading || authLoading) {
    return <Layout userName="..."><div className="p-8">Carregando...</div></Layout>;
  }

  const incomeCategories = categories.filter(c => c.type === "income");
  const expenseCategories = categories.filter(c => c.type === "expense");

  const CategoryList = ({ items, type }: { items: any[], type: "income" | "expense" }) => {
    const Icon = type === "income" ? TrendingUp : TrendingDown;
    const color = type === "income" ? "text-success" : "text-destructive";

    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon className={`w-16 h-16 ${color} mb-4 opacity-50`} />
            <p className="text-muted-foreground text-center">
              Nenhuma categoria cadastrada
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((category) => (
          <Card key={category.id} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <CardTitle className="text-base">{category.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(category)} className="flex-1">
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(category.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Layout userName={user?.email || "Usuário"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Categorias</h2>
            <p className="text-muted-foreground">Organize receitas e despesas</p>
          </div>
        </div>

        <Tabs defaultValue="income" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="income">Receitas</TabsTrigger>
              <TabsTrigger value="expense">Despesas</TabsTrigger>
            </TabsList>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingCategory(null);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Editar" : "Nova"} Categoria</DialogTitle>
                  <DialogDescription>
                    {editingCategory ? "Atualize" : "Crie"} uma categoria para organizar suas transações
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Categoria</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      placeholder="Ex: Frete, Manutenção, etc." 
                      defaultValue={editingCategory?.name}
                      required 
                    />
                  </div>
                  {!editingCategory && (
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={categoryType === "income" ? "default" : "outline"}
                          onClick={() => setCategoryType("income")}
                          className="flex-1"
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Receita
                        </Button>
                        <Button
                          type="button"
                          variant={categoryType === "expense" ? "default" : "outline"}
                          onClick={() => setCategoryType("expense")}
                          className="flex-1"
                        >
                          <TrendingDown className="w-4 h-4 mr-2" />
                          Despesa
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="w-full">
                    {editingCategory ? "Atualizar" : "Criar"} Categoria
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="income">
            <CategoryList items={incomeCategories} type="income" />
          </TabsContent>

          <TabsContent value="expense">
            <CategoryList items={expenseCategories} type="expense" />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Categories;
