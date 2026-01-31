import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none transition focus:border-ink-500 focus:ring-2 focus:ring-ink-200",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
