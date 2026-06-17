import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("mb-2 block text-sm font-semibold text-wv-navy", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";

/** Shared native-select styling to keep form controls consistent. */
export const selectClass =
  "h-11 w-full cursor-pointer appearance-none rounded-md border border-wv-border-strong bg-white px-3.5 pr-10 text-base text-foreground transition-colors hover:border-muted-foreground focus-visible:border-wv-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2218%22 height=%2218%22 fill=%22none%22 stroke=%22%2351607a%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%225 7 9 11 13 7%22/></svg>')] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat";
