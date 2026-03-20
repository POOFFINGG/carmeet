import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "glass" | "danger";
  size?: "sm" | "default" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
    
    const variants = {
      default: "bg-gradient-to-r from-primary to-red-600 text-primary-foreground shadow-glow hover:shadow-[0_0_25px_-5px_rgba(229,57,53,0.7)] border border-red-500/50",
      outline: "border-2 border-border bg-transparent hover:bg-secondary text-foreground",
      ghost: "hover:bg-secondary text-foreground",
      glass: "glass-panel text-foreground hover:bg-white/10",
      danger: "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20",
    };

    const sizes = {
      sm: "h-9 px-4 text-xs",
      default: "h-12 px-6",
      lg: "h-14 px-8 text-base",
      icon: "h-12 w-12",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
