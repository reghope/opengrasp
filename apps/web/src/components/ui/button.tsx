import * as React from "react";
import { cn } from "../../lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const styles = {
      primary:
        "bg-ink-900 text-ink-50 hover:bg-ink-800 border border-ink-900",
      ghost: "bg-transparent hover:bg-ink-100 text-ink-800",
      outline:
        "bg-transparent border border-ink-300 text-ink-800 hover:bg-ink-100"
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
          styles[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
