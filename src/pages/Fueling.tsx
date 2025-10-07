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
import { Plus, Fuel, Trash2 } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { parseLocalDate, formatDateForInput } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, loading: authLoading } = useAuth();
  const [fuelings, setFuelings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      const [fuelingsRes, vehiclesRes] = await Promise.all([
        supabase.from("fuelings").select("*").order("date", { ascending: false }),
        supabase.from("vehicles").select("*"),
      ]);

      if (fuelingsRes.error) throw fuelingsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;

      setFuelings(fuelingsRes.data || []);
      setVehicles(vehiclesRes.data || []);
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

  const calculateConsumption = (vehicleId: string) => {
    const vehicleFuelings = fuelings
      .filter(f => f.vehicle_id === vehicleId)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

      const { error } = await supabase
        .from("fuelings")
        .insert([{
          user_id: user!.id,
          vehicle_id: data.vehicleId,
          liters: data.liters,
          fuel_type: data.fuelType,
          total_amount: data.totalAmount,
          odometer: data.odometer,
          date: data.date,
        }]);

      if (error) throw error;

      toast({ title: "Abastecimento registrado com sucesso!" });
      setIsDialogOpen(false);
      e.currentTarget.reset();
      await fetchData();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error saving fueling:", error);
        toast({
          title: "Erro ao salvar abastecimento",
          description: "Tente novamente mais tarde",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fuelings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Abastecimento removido com sucesso!" });
      await fetchData();
    } catch (error) {
      console.error("Error deleting fueling:", error);
      toast({
        title: "Erro ao remover abastecimento",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };

  if (loading || authLoading) {
    return <Layout userName="..."><div className="p-8">Carregando...</div></Layout>;
  }

  return (
    <Layout userName={user?.email || "Usuário"}>
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
                      {vehicles.map(v => (
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
                    <Input id="date" name="date" type="date" defaultValue={formatDateForInput(new Date())} required />
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
          {vehicles.map((vehicle) => {
            const consumption = calculateConsumption(vehicle.id);
            const vehicleFuelingCount = fuelings.filter(f => f.vehicle_id === vehicle.id).length;
            
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

        {fuelings.length === 0 ? (
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
            {fuelings.map((fueling) => {
              const vehicle = vehicles.find(v => v.id === fueling.vehicle_id);
              const pricePerLiter = fueling.total_amount / fueling.liters;

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
                            <span className="text-sm text-muted-foreground">{fueling.fuel_type}</span>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span>{fueling.liters.toFixed(2)}L</span>
                            <span>R$ {pricePerLiter.toFixed(2)}/L</span>
                            <span>{fueling.odometer.toLocaleString()} km</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseLocalDate(fueling.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-accent">
                          R$ {fueling.total_amount.toFixed(2)}
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
