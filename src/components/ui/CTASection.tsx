import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Link } from "react-router-dom";
import { ArrowLeft, LucideIcon } from "lucide-react";

interface CTAButton {
  text: string;
  href: string;
  variant?: "default" | "outline" | "secondary";
  icon?: LucideIcon;
}

interface CTASectionProps {
  title: string;
  subtitle?: string;
  buttons?: CTAButton[];
  className?: string;
  variant?: "primary" | "dark" | "gradient" | "light";
  layout?: "centered" | "split";
  children?: React.ReactNode;
}

export function CTASection({
  title,
  subtitle,
  buttons = [],
  className,
  variant = "primary",
  layout = "centered",
  children,
}: CTASectionProps) {
  return (
    <section
      className={cn(
        "section-padding",
        variant === "primary" && "bg-gradient-cta text-primary-foreground",
        variant === "dark" && "bg-gradient-to-br from-foreground via-foreground/95 to-foreground text-background",
        variant === "gradient" && "bg-gradient-to-br from-primary via-sity-blue to-primary text-primary-foreground",
        variant === "light" && "bg-muted/30 text-foreground",
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {layout === "centered" ? (
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 animate-fade-in">
              {title}
            </h2>
            
            {subtitle && (
              <p
                className={cn(
                  "text-lg mb-10 max-w-xl mx-auto animate-fade-in opacity-90",
                  variant !== "light" && "text-current/80"
                )}
                style={{ animationDelay: "0.1s" }}
              >
                {subtitle}
              </p>
            )}

            {children}

            {buttons.length > 0 && (
              <div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in"
                style={{ animationDelay: "0.2s" }}
              >
                {buttons.map((button) => (
                  <Button
                    key={button.text}
                    size="lg"
                    variant={button.variant || (variant === "light" ? "default" : "secondary")}
                    className="h-14 px-8 font-medium"
                    asChild
                  >
                    <Link to={button.href}>
                      {button.text}
                      {button.icon ? (
                        <button.icon className="w-5 h-5 mr-2" />
                      ) : (
                        <ArrowLeft className="w-5 h-5 mr-2" />
                      )}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

// Sub-component for split layout
export function CTACard({
  title,
  description,
  button,
  className,
}: {
  title: string;
  description: string;
  button: CTAButton;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card/10 backdrop-blur-sm p-8 rounded-3xl border border-border/20 animate-fade-in",
        className
      )}
    >
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="opacity-80 mb-6">{description}</p>
      <Button
        size="lg"
        variant={button.variant || "default"}
        className="w-full h-14"
        asChild
      >
        <Link to={button.href}>
          {button.text}
          {button.icon ? (
            <button.icon className="w-5 h-5 mr-2" />
          ) : (
            <ArrowLeft className="w-5 h-5 mr-2" />
          )}
        </Link>
      </Button>
    </div>
  );
}