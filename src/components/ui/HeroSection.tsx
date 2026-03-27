import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Link } from "react-router-dom";
import { ArrowLeft, LucideIcon } from "lucide-react";

interface HeroButton {
  text: string;
  href: string;
  variant?: "default" | "outline" | "secondary";
  icon?: LucideIcon;
}

interface HeroSectionProps {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  buttons?: HeroButton[];
  stats?: Array<{ value: string; label: string }>;
  className?: string;
  variant?: "default" | "centered" | "split";
  size?: "default" | "large" | "compact";
  children?: React.ReactNode;
}

export function HeroSection({
  badge,
  badgeIcon: BadgeIcon,
  title,
  titleHighlight,
  subtitle,
  buttons = [],
  stats = [],
  className,
  variant = "centered",
  size = "default",
  children,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden",
        size === "compact" && "py-16 lg:py-20",
        size === "default" && "py-20 lg:py-32",
        size === "large" && "py-28 lg:py-40",
        className
      )}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none">
        <div className="decorative-blob top-20 right-20 w-72 h-72 bg-primary/30" />
        <div className="decorative-blob bottom-20 left-20 w-96 h-96 bg-accent/20" style={{ animationDelay: "2s" }} />
        <div className="decorative-blob top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sity-green/10" style={{ animationDelay: "4s" }} />
      </div>

      {/* Decorative lines */}
      <div className="absolute top-0 left-1/4 decorative-line h-32 opacity-50" />
      <div className="absolute bottom-0 right-1/3 decorative-line h-24 opacity-50" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className={cn(
          variant === "centered" && "max-w-4xl mx-auto text-center",
          variant === "split" && "grid lg:grid-cols-2 gap-12 items-center"
        )}>
          <div>
            {/* Badge */}
            {badge && (
              <div className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-medium mb-8 shadow-sm animate-fade-in">
                {BadgeIcon && <BadgeIcon className="w-4 h-4 text-primary" />}
                {badge}
              </div>
            )}

            {/* Title */}
            <h1
              className={cn(
                "font-bold text-foreground leading-tight animate-fade-in",
                size === "compact" && "text-3xl sm:text-4xl lg:text-5xl",
                size === "default" && "text-4xl sm:text-5xl lg:text-6xl xl:text-7xl",
                size === "large" && "text-5xl sm:text-6xl lg:text-7xl xl:text-8xl"
              )}
              style={{ animationDelay: "0.1s" }}
            >
              {title}
              {titleHighlight && (
                <span className="block mt-2 text-gradient-multi">{titleHighlight}</span>
              )}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p
                className={cn(
                  "text-muted-foreground max-w-2xl mt-6 leading-relaxed animate-fade-in",
                  variant === "centered" && "mx-auto",
                  size === "compact" && "text-base",
                  size === "default" && "text-lg sm:text-xl",
                  size === "large" && "text-xl sm:text-2xl"
                )}
                style={{ animationDelay: "0.2s" }}
              >
                {subtitle}
              </p>
            )}

            {/* Buttons */}
            {buttons.length > 0 && (
              <div
                className={cn(
                  "flex flex-col sm:flex-row items-center gap-4 mt-10 animate-fade-in",
                  variant === "centered" && "justify-center"
                )}
                style={{ animationDelay: "0.3s" }}
              >
                {buttons.map((button, index) => (
                  <Button
                    key={button.text}
                    size="lg"
                    variant={button.variant || "default"}
                    className={cn(
                      "h-14 px-8 text-lg font-medium",
                      button.variant === "default" && "shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30",
                      button.variant === "outline" && "border-2"
                    )}
                    asChild
                  >
                    <Link to={button.href}>
                      {button.text}
                      {button.icon ? (
                        <button.icon className="w-5 h-5 mr-2" />
                      ) : index === 0 ? (
                        <ArrowLeft className="w-5 h-5 mr-2" />
                      ) : null}
                    </Link>
                  </Button>
                ))}
              </div>
            )}

            {/* Stats */}
            {stats.length > 0 && (
              <div
                className={cn(
                  "flex items-center gap-6 sm:gap-12 mt-16 animate-fade-in flex-wrap",
                  variant === "centered" && "justify-center"
                )}
                style={{ animationDelay: "0.4s" }}
              >
                {stats.map((stat, index) => (
                  <div key={stat.label} className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-3xl sm:text-4xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                    {index < stats.length - 1 && (
                      <div className="w-px h-14 bg-border" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Children (for split variant) */}
          {variant === "split" && children && (
            <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}