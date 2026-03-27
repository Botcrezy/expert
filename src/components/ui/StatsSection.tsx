import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Stat {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface StatsSectionProps {
  stats: Stat[];
  className?: string;
  variant?: "default" | "cards" | "inline";
}

export function StatsSection({ stats, className, variant = "default" }: StatsSectionProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center justify-center gap-6 sm:gap-12 flex-wrap", className)}>
        {stats.map((stat, index) => (
          <div key={stat.label} className="flex items-center gap-6">
            <div className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              {stat.icon && (
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              )}
              <p className="text-3xl sm:text-4xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
            {index < stats.length - 1 && (
              <div className="w-px h-14 bg-border" />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6", className)}>
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="p-6 rounded-2xl bg-card border border-border/50 text-center animate-fade-in hover:border-primary/30 transition-all"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {stat.icon && (
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
            )}
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-8", className)}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="text-center animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {stat.icon && (
            <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
          )}
          <p className="text-4xl sm:text-5xl font-bold text-foreground">{stat.value}</p>
          <p className="text-muted-foreground mt-2">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}