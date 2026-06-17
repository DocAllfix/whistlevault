import { HelpCircle } from "lucide-react";
import { ReactNode } from "react";
import { Label } from "./label";

/** Label con icona "?" e tooltip nativo, per spiegare campi tecnici inline (stile Stripe). */
export function LabelWithHelp({
  htmlFor,
  children,
  help,
}: {
  htmlFor?: string;
  children: ReactNode;
  help: string;
}) {
  return (
    <div className="mb-2 inline-flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="mb-0">
        {children}
      </Label>
      <span
        title={help}
        aria-label={help}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
