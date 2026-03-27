import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description: string;
  className?: string;
  variant?: "default" | "outlined" | "gradient" | "glass";
  size?: "default" | "compact" | "large";
  index?: number;
}

export function FeatureCard({
  icon: Icon,
  emoji,
  title,
  description,
  className,
  variant = "default",
  size = "default",
  index = 0,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-3xl transition-all duration-300 animate-fade-in",
        variant === "default" && "bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg",
        variant === "outlined" && "bg-transparent border-2 border-border hover:border-primary/50",
        variant === "gradient" && "bg-gradient-to-br from-card to-muted/50 border border-border/30 hover:shadow-xl",
        variant === "glass" && "bg-card/80 backdrop-blur-xl border border-border/30 hover:bg-card",
        size === "compact" && "p-5",
        size === "default" && "p-6 lg:p-8",
        size === "large" && "p-8 lg:p-10",
        className
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Icon or Emoji */}
      {(Icon || emoji) && (
        <div
          className={cn(
            "flex items-center justify-center mb-5 transition-all duration-300",
            size === "compact" && "w-12 h-12 rounded-xl",
            size === "default" && "w-14 h-14 rounded-2xl",
            size === "large" && "w-16 h-16 rounded-2xl",
            "bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20"
          )}
        >
          {Icon ? (
            <Icon
              className={cn(
                "text-primary transition-transform duration-300 group-hover:scale-110",
                size === "compact" && "w-6 h-6",
                size === "default" && "w-7 h-7",
                size === "large" && "w-8 h-8"
              )}
            />
          ) : (
            <span
              className={cn(
                size === "compact" && "text-2xl",
                size === "default" && "text-3xl",
                size === "large" && "text-4xl"
              )}
            >
              {emoji}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <h3
        className={cn(
          "font-bold text-foreground mb-2 group-hover:text-primary transition-colors",
          size === "compact" && "text-lg",
          size === "default" && "text-xl",
          size === "large" && "text-2xl"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-muted-foreground leading-relaxed",
          size === "compact" && "text-sm",
          size === "default" && "text-base",
          size === "large" && "text-lg"
        )}
      >
        {description}
      </p>

      {/* Hover decoration */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-500 pointer-events-none" />
    </div>
  );
}