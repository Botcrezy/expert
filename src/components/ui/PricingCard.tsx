import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Link } from "react-router-dom";
import { CheckCircle2, LucideIcon } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: number | string;
  period?: string;
  description?: string;
  features: string[];
  buttonText?: string;
  buttonHref?: string;
  icon?: LucideIcon;
  isPopular?: boolean;
  isFree?: boolean;
  className?: string;
  index?: number;
}

export function PricingCard({
  name,
  price,
  period = "شهرياً",
  description,
  features,
  buttonText = "اشترك الآن",
  buttonHref = "/register",
  icon: Icon,
  isPopular = false,
  isFree = false,
  className,
  index = 0,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative p-8 rounded-3xl bg-card transition-all duration-300 animate-fade-in",
        isPopular 
          ? "border-2 border-primary ring-4 ring-primary/10 shadow-xl scale-105" 
          : "border border-border/50 hover:border-primary/30 hover:shadow-lg",
        className
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-sity-blue text-primary-foreground px-5 py-1.5 rounded-full text-sm font-medium shadow-lg">
          الأكثر شعبية
        </div>
      )}

      {/* Icon */}
      {Icon && (
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center mb-5",
          isPopular 
            ? "bg-primary text-primary-foreground" 
            : "bg-primary/10 text-primary"
        )}>
          <Icon className="w-7 h-7" />
        </div>
      )}

      {/* Name */}
      <h3 className="text-xl font-bold text-foreground mb-2">{name}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-bold text-foreground">
          {typeof price === "number" ? price.toLocaleString() : price}
        </span>
        {!isFree && (
          <span className="text-muted-foreground">ج.م / {period}</span>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Button */}
      <Button
        className="w-full h-12"
        variant={isPopular ? "default" : "outline"}
        asChild
      >
        <Link to={buttonHref}>{buttonText}</Link>
      </Button>
    </div>
  );
}