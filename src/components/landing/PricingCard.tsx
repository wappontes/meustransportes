import { Check } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PricingCardProps {
  name: string;
  vehicles: string;
  price: number;
  features: string[];
  paymentLink: string;
  isPopular?: boolean;
}

export function PricingCard({
  name,
  vehicles,
  price,
  features,
  paymentLink,
  isPopular = false,
}: PricingCardProps) {
  const handleSubscribe = () => {
    window.location.href = paymentLink;
  };

  return (
    <Card className={`relative flex flex-col ${isPopular ? 'border-primary border-2 shadow-lg' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-3 right-4 bg-primary">
          Popular
        </Badge>
      )}
      <CardHeader className="text-center pb-4">
        <h3 className="text-2xl font-bold">{name}</h3>
        <p className="text-muted-foreground">{vehicles}</p>
        <div className="mt-4">
          <span className="text-4xl font-bold text-primary">R$ {price}</span>
          <span className="text-muted-foreground">/mês</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
          <p className="text-sm text-primary font-medium">Garantia de 30 dias:</p>
          <p className="text-sm text-muted-foreground">
            Se não gostar, devolvemos seu dinheiro
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button 
          onClick={handleSubscribe}
          className="w-full"
          size="lg"
        >
          Assinar por R$ {price}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Cancele quando quiser
        </p>
      </CardFooter>
    </Card>
  );
}
