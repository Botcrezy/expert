import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

export function ThemeToggle({ className, variant = "ghost" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "h-9 w-9 rounded-full transition-all duration-300",
        theme === "dark" 
          ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" 
          : "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
        className
      )}
    >
      <div className="relative w-5 h-5">
        <Sun className={cn(
          "absolute inset-0 h-5 w-5 transition-all duration-300",
          theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"
        )} />
        <Moon className={cn(
          "absolute inset-0 h-5 w-5 transition-all duration-300",
          theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
        )} />
      </div>
      <span className="sr-only">تغيير الوضع</span>
    </Button>
  );
}
