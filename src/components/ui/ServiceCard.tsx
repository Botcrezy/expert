import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, LucideIcon } from "lucide-react";

interface ServiceCardProps {
  icon?: LucideIcon;
  emoji?: string;
  name: string;
  description: string;
  features?: string[];
  price?: string;
  buttonText?: string;
  buttonHref?: string;
  className?: string;
  variant?: "default" | "compact" | "detailed";
  index?: number;
}

export function ServiceCard({
  icon: Icon,
  emoji,
  name,
  description,
  features = [],
  price,
  buttonText = "اطلب الآن",
  buttonHref = "/register",
  className,
  variant = "default",
  index = 0,
}: ServiceCardProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "group p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in",
          className
        )}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {/* Icon/Emoji */}
        <div className="flex items-center gap-4 mb-3">
          {Icon ? (
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="w-6 h-6" />
            </div>
          ) : emoji ? (
            <span className="text-3xl">{emoji}</span>
          ) : null}
          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group p-6 lg:p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 animate-fade-in",
        className
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Icon/Emoji */}
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300",
        "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110"
      )}>
        {Icon ? (
          <Icon className="w-7 h-7" />
        ) : emoji ? (
          <span className="text-2xl">{emoji}</span>
        ) : null}
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
        {name}
      </h3>
      <p className="text-muted-foreground text-sm mb-5 line-clamp-3">{description}</p>

      {/* Features */}
      {features.length > 0 && (
        <ul className="space-y-2 mb-6">
          {features.slice(0, 4).map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-5 border-t border-border/50">
        {price && (
          <span className="text-primary font-semibold">{price}</span>
        )}
        <Button variant="ghost" size="sm" className="mr-auto" asChild>
          <Link to={buttonHref}>
            {buttonText}
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}