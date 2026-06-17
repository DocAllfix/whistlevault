import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-card px-3.5 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground/70 hover:border-muted-foreground focus-visible:border-wv-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 file:mr-3 file:rounded file:border file:border-input file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
