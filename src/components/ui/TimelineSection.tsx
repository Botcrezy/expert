import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface TimelineItem {
  number?: string;
  icon?: LucideIcon;
  title: string;
  description: string;
  tags?: string[];
}

interface TimelineSectionProps {
  items: TimelineItem[];
  className?: string;
  variant?: "default" | "compact" | "cards";
}

export function TimelineSection({ items, className, variant = "default" }: TimelineSectionProps) {
  if (variant === "cards") {
    return (
      <div className={cn("grid md:grid-cols-3 gap-6 lg:gap-8", className)}>
        {items.map((item, index) => (
          <div
            key={item.title}
            className="relative text-center p-8 rounded-3xl bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 0.15}s` }}
          >
            {item.number && (
              <div className="text-4xl font-bold text-primary/20 mb-4">{item.number}</div>
            )}
            
            {item.icon && (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-sity-blue text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
                <item.icon className="w-8 h-8" />
              </div>
            )}
            
            <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
            <p className="text-muted-foreground">{item.description}</p>
            
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-muted/50 text-muted-foreground text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {items.map((item, index) => (
        <div
          key={item.title}
          className="timeline-item animate-fade-in"
          style={{ animationDelay: `${index * 0.15}s` }}
        >
          {/* Line connector */}
          {index < items.length - 1 && <div className="timeline-line" />}

          {/* Number/Icon */}
          <div className="shrink-0">
            <div className="timeline-dot">
              {item.icon ? (
                <item.icon className="w-6 h-6" />
              ) : (
                item.number || String(index + 1).padStart(2, "0")
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 pt-2">
            <div className="flex items-center gap-3 mb-3">
              {item.icon && item.number && (
                <item.icon className="w-5 h-5 text-primary" />
              )}
              <h3 className="text-xl lg:text-2xl font-bold text-foreground">{item.title}</h3>
            </div>

            <p className="text-muted-foreground text-lg mb-4">{item.description}</p>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-muted/50 text-muted-foreground text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}