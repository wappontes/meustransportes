export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: "income" | "expense";
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  vehicleId: string;
  categoryId: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface Fueling {
  id: string;
  userId: string;
  vehicleId: string;
  liters: number;
  fuelType: string;
  totalAmount: number;
  odometer: number;
  date: string;
  createdAt: string;
}
