import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-wv-accent-tint text-wv-accent-strong",
        navy: "border-transparent bg-wv-navy text-white",
        outline: "border-wv-border-strong text-wv-navy",
        success: "border-transparent bg-[#EAF6EE] text-wv-success",
        warning: "border-transparent bg-[#FCF4E9] text-wv-warning",
        danger: "border-transparent bg-[#FDF0EF] text-wv-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
