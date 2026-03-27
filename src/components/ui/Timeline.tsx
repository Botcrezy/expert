import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  icon?: LucideIcon;
  status?: "completed" | "current" | "pending";
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-border" />
      
      <div className="space-y-6">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isCompleted = item.status === "completed";
          const isCurrent = item.status === "current";
          
          return (
            <div key={item.id} className="relative flex gap-4">
              {/* Dot/Icon */}
              <div className={cn(
                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                isCompleted && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}>
                {Icon ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>
              
              {/* Content */}
              <div className={cn(
                "flex-1 pb-6",
                index === items.length - 1 && "pb-0"
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={cn(
                      "font-medium",
                      isCurrent && "text-primary"
                    )}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.date}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
