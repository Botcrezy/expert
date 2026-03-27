import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  className?: string;
  align?: "center" | "left" | "right";
  size?: "default" | "large" | "small";
}

export function SectionHeader({
  badge,
  badgeIcon: BadgeIcon,
  title,
  titleHighlight,
  subtitle,
  className,
  align = "center",
  size = "default",
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-3xl mx-auto mb-12 lg:mb-16",
        align === "center" && "text-center",
        align === "left" && "text-right mr-0",
        align === "right" && "text-left ml-0",
        className
      )}
    >
      {badge && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 bg-primary/10 text-primary dark:bg-primary/20 animate-fade-in">
          {BadgeIcon && <BadgeIcon className="w-4 h-4" />}
          {badge}
        </div>
      )}

      <h2
        className={cn(
          "font-bold text-foreground leading-tight animate-fade-in",
          size === "small" && "text-2xl sm:text-3xl",
          size === "default" && "text-3xl sm:text-4xl lg:text-5xl",
          size === "large" && "text-4xl sm:text-5xl lg:text-6xl"
        )}
        style={{ animationDelay: "0.1s" }}
      >
        {title}
        {titleHighlight && (
          <span className="block mt-2 text-gradient-multi">{titleHighlight}</span>
        )}
      </h2>

      {subtitle && (
        <p
          className={cn(
            "text-muted-foreground mt-4 animate-fade-in",
            size === "small" && "text-base",
            size === "default" && "text-lg",
            size === "large" && "text-xl"
          )}
          style={{ animationDelay: "0.2s" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}