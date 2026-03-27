import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-scale",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_14px_30px_-12px_hsl(var(--primary)/0.55)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_14px_30px_-12px_hsl(var(--destructive)/0.6)]",
        outline:
          "border border-border bg-background/80 hover:bg-accent/10 hover:text-accent-foreground shadow-[0_0_0_1px_hsl(var(--border)/0.6)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_10px_24px_-14px_hsl(var(--secondary)/0.8)]",
        ghost:
          "bg-transparent hover:bg-accent/10 hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline px-0 h-auto",
        success:
          "bg-success text-success-foreground hover:bg-success/90 shadow-[0_14px_30px_-12px_hsl(var(--success)/0.6)]",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 shadow-[0_14px_30px_-12px_hsl(var(--warning)/0.6)]",
        hero:
          "bg-gradient-to-l from-primary via-accent to-primary text-primary-foreground shadow-glow hover:shadow-[0_18px_45px_-22px_hsl(var(--primary)/0.9)]",
        "hero-outline":
          "border-2 border-primary/80 text-primary bg-background/5 hover:bg-primary hover:text-primary-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]",
        subtle:
          "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-2xl px-8 text-base",
        xl: "h-12 rounded-2xl px-10 text-base",
        icon: "h-10 w-10 rounded-full",
        "icon-sm": "h-8 w-8 rounded-full",
        "icon-lg": "h-12 w-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // When asChild is true, we can't add the loading spinner as it would break the single child requirement
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
