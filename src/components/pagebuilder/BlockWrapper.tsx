import { ReactNode } from "react";
import { PageBlock } from "./BlockTypes";
import { cn } from "@/lib/utils";

interface BlockWrapperProps {
  block: PageBlock;
  children: ReactNode;
}

// Animation classes
const animationClasses: Record<string, string> = {
  "fade-in": "animate-fade-in",
  "slide-up": "animate-slide-up",
  "slide-down": "animate-slide-down",
  "zoom-in": "animate-zoom-in",
};

// Background gradient classes
const gradientClasses: Record<string, string> = {
  "from-primary to-primary/80": "bg-gradient-to-br from-primary to-primary/80",
  "from-blue-600 to-cyan-500": "bg-gradient-to-br from-blue-600 to-cyan-500",
  "from-purple-600 to-pink-500": "bg-gradient-to-br from-purple-600 to-pink-500",
  "from-orange-500 to-red-500": "bg-gradient-to-br from-orange-500 to-red-500",
  "from-green-500 to-emerald-500": "bg-gradient-to-br from-green-500 to-emerald-500",
  "from-gray-900 to-gray-800": "bg-gradient-to-br from-gray-900 to-gray-800",
};

export function BlockWrapper({ block, children }: BlockWrapperProps) {
  const { settings } = block;

  // Build class names based on settings
  const wrapperClasses = cn(
    // Padding
    settings.padding || "py-16",
    settings.paddingX || "px-4",
    
    // Background
    settings.bgType === "color" && settings.bgColor,
    settings.bgType === "gradient" && gradientClasses[settings.bgGradient || "from-primary to-primary/80"],
    
    // Text colors
    settings.textColor,
    
    // Alignment
    settings.alignment === "center" && "text-center",
    settings.alignment === "left" && "text-left",
    settings.alignment === "right" && "text-right",
    
    // Border
    settings.border && settings.border !== "none" && settings.border,
    settings.border && settings.border !== "none" && "border-border",
    
    // Shadow
    settings.shadow && settings.shadow !== "none" && settings.shadow,
    
    // Animation
    settings.animation && settings.animation !== "none" && animationClasses[settings.animation],
    
    // Max width container
    "relative overflow-hidden"
  );

  // Background image style
  const backgroundStyle = settings.bgType === "image" && settings.bgImage
    ? {
        backgroundImage: `url(${settings.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  // If gradient with text, ensure text is white
  const needsWhiteText = settings.bgType === "gradient" || 
    (settings.bgType === "color" && settings.bgColor === "bg-primary");

  return (
    <section 
      className={cn(wrapperClasses, needsWhiteText && "text-white")}
      style={backgroundStyle}
    >
      {settings.bgType === "image" && settings.bgImage && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      <div className={cn("container mx-auto relative", settings.maxWidth || "max-w-7xl")}>
        {children}
      </div>
    </section>
  );
}
