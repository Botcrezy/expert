import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  iconClassName?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className,
  iconClassName 
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;
  
  return (
    <div className={cn("stat-card group", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{title}</p>
          <p className="stat-value mt-2">{value}</p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              isPositive ? "text-green-600" : "text-red-600"
            )}>
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
          "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
          iconClassName
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
