import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Fueling as FuelingType, Vehicle } from "@/types";
import { Plus, Fuel, Trash2, TrendingUp } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";

const fuelingSchema = z.object({
  vehicleId: z.string().min(1, "Selecione um veículo"),
  liters: z.coerce.number().positive("Quantidade deve ser positiva"),
  fuelType: z.string().min(1, "Selecione o tipo de combustível"),
  totalAmount: z.coerce.number().positive("Valor deve ser positivo"),
  odometer: z.coerce.number().positive("Quilometragem deve ser positiva"),
  date: z.string().min(1, "Data é obrigatória"),
});

const Fueling = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [fuelings, setFuelings] = useLocalStorage<FuelingType[]>("fuelings", []);
  const [vehicles] = useLocalStorage<Vehicle[]>("vehicles", []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
      navigate("/");
    } else {
      setUser(JSON.parse(currentUser));
    }
  }, [navigate]);

  const calculateConsumption = (vehicleId: string) => {
    const vehicleFuelings = userFuelings
      .filter(f => f.vehicleId === vehicleId)
      .sort((a, b) => a.odometer - b.odometer);

    if (vehicleFuelings.length < 2) return null;

    let totalKm = 0;
    let totalLiters = 0;

    for (let i = 1; i < vehicleFuelings.length; i++) {
      const kmDiff = vehicleFuelings[i].odometer - vehicleFuelings[i - 1].odometer;
      totalKm += kmDiff;
      totalLiters += vehicleFuelings[i].liters;
    }

    return totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : null;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const data = fuelingSchema.parse({
        vehicleId: formData.get("vehicleId"),
        liters: formData.get("liters"),
        fuelType: formData.get("fuelType"),
        totalAmount: formData.get("totalAmount"),
        odometer: formData.get("odometer"),
        date: formData.get("date"),
      });

      const newFueling: FuelingType = {
        id: Date.now().toString(),
        userId: user.id,
        vehicleId: data.vehicleId,
        liters: data.liters,
        fuelType: data.fuelType,
        totalAmount: data.totalAmount,
        odometer: data.odometer,
        date: data.date,
        createdAt: new Date().toISOString(),
      };
      
      setFuelings([...fuelings, newFueling]);
      toast({ title: "Abastecimento registrado com sucesso!" });
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
    setFuelings(fuelings.filter(f => f.id !== id));
    toast({ title: "Abastecimento removido com sucesso!" });
  };

  if (!user) return null;

  const userVehicles = vehicles.filter(v => v.userId === user.id);
  const userFuelings = fuelings.filter(f => f.userId === user.id).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Layout userName={user.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Abastecimento</h2>
            <p className="text-muted-foreground">Controle de combustível e consumo</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Abastecimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Abastecimento</DialogTitle>
                <DialogDescription>
                  Registre o abastecimento do veículo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="fuelType">Tipo de Combustível</Label>
                  <Select name="fuelType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gasolina">Gasolina</SelectItem>
                      <SelectItem value="Etanol">Etanol</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="GNV">GNV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="liters">Litros</Label>
                    <Input id="liters" name="liters" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Valor (R$)</Label>
                    <Input id="totalAmount" name="totalAmount" type="number" step="0.01" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="odometer">KM Atual</Label>
                    <Input id="odometer" name="odometer" type="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input id="date" name="date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Registrar Abastecimento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userVehicles.map((vehicle) => {
            const consumption = calculateConsumption(vehicle.id);
            const vehicleFuelingCount = userFuelings.filter(f => f.vehicleId === vehicle.id).length;
            
            return (
              <Card key={vehicle.id} className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                      <Fuel className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                      <CardDescription>{vehicle.plate}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Média de Consumo</span>
                      <span className="text-lg font-bold text-accent">
                        {consumption ? `${consumption} km/l` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Abastecimentos</span>
                      <span className="text-sm font-medium">{vehicleFuelingCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {userFuelings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Fuel className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum abastecimento registrado. Adicione o primeiro!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">Histórico de Abastecimentos</h3>
            {userFuelings.map((fueling) => {
              const vehicle = userVehicles.find(v => v.id === fueling.vehicleId);
              const pricePerLiter = fueling.totalAmount / fueling.liters;

              return (
                <Card key={fueling.id} className="shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                          <Fuel className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{vehicle?.name}</h3>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{fueling.fuelType}</span>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span>{fueling.liters.toFixed(2)}L</span>
                            <span>R$ {pricePerLiter.toFixed(2)}/L</span>
                            <span>{fueling.odometer.toLocaleString()} km</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(fueling.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-accent">
                          R$ {fueling.totalAmount.toFixed(2)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(fueling.id)}
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

export default Fueling;
