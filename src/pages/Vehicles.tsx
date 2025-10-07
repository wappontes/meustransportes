import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Vehicle } from "@/types";
import { Plus, Car, Trash2, Edit } from "lucide-react";
import { z } from "zod";

const vehicleSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  brand: z.string().trim().min(1, "Marca é obrigatória").max(50),
  model: z.string().trim().min(1, "Modelo é obrigatório").max(50),
  year: z.coerce.number().min(1900, "Ano inválido").max(new Date().getFullYear() + 1),
  plate: z.string().trim().min(1, "Placa é obrigatória").max(10),
});

const Vehicles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

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
      const data = vehicleSchema.parse({
        name: formData.get("name"),
        brand: formData.get("brand"),
        model: formData.get("model"),
        year: formData.get("year"),
        plate: formData.get("plate"),
      });

      if (editingVehicle) {
        setVehicles(vehicles.map(v => 
          v.id === editingVehicle.id 
            ? { ...editingVehicle, ...data }
            : v
        ));
        toast({ title: "Veículo atualizado com sucesso!" });
      } else {
        const newVehicle: Vehicle = {
          id: Date.now().toString(),
          userId: user.id,
          name: data.name,
          brand: data.brand,
          model: data.model,
          year: data.year,
          plate: data.plate,
          createdAt: new Date().toISOString(),
        };
        setVehicles([...vehicles, newVehicle]);
        toast({ title: "Veículo cadastrado com sucesso!" });
      }

      setIsDialogOpen(false);
      setEditingVehicle(null);
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
    setVehicles(vehicles.filter(v => v.id !== id));
    toast({ title: "Veículo removido com sucesso!" });
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsDialogOpen(true);
  };

  if (!user) return null;

  const userVehicles = vehicles.filter(v => v.userId === user.id);

  return (
    <Layout userName={user.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Veículos</h2>
            <p className="text-muted-foreground">Gerencie sua frota</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingVehicle(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Veículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVehicle ? "Editar" : "Adicionar"} Veículo</DialogTitle>
                <DialogDescription>
                  Preencha as informações do veículo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome/Apelido</Label>
                  <Input id="name" name="name" defaultValue={editingVehicle?.name} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input id="brand" name="brand" defaultValue={editingVehicle?.brand} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Input id="model" name="model" defaultValue={editingVehicle?.model} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Ano</Label>
                    <Input id="year" name="year" type="number" defaultValue={editingVehicle?.year} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plate">Placa</Label>
                    <Input id="plate" name="plate" defaultValue={editingVehicle?.plate} required />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingVehicle ? "Atualizar" : "Cadastrar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {userVehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum veículo cadastrado. Adicione seu primeiro veículo!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Car className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                        <CardDescription>{vehicle.plate}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Marca:</span> {vehicle.brand}</p>
                    <p><span className="text-muted-foreground">Modelo:</span> {vehicle.model}</p>
                    <p><span className="text-muted-foreground">Ano:</span> {vehicle.year}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(vehicle)} className="flex-1">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(vehicle.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Vehicles;
