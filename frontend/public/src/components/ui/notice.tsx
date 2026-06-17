import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Alert, Check, Info } from "../icons";

type Variant = "info" | "warn" | "ok";

const styles: Record<Variant, string> = {
  info: "border-wv-accent/40 bg-wv-accent-tint text-[#0c3a52]",
  warn: "border-wv-warning/50 bg-[#FCF4E9] text-[#6b3a06]",
  ok: "border-wv-success/40 bg-[#EAF6EE] text-[#0f5128]",
};
const iconColor: Record<Variant, string> = {
  info: "text-wv-accent",
  warn: "text-wv-warning",
  ok: "text-wv-success",
};
const Icons = { info: Info, warn: Alert, ok: Check };

export function Notice({
  variant = "info",
  children,
  role,
}: {
  variant?: Variant;
  children: ReactNode;
  role?: string;
}) {
  const Icon = Icons[variant];
  return (
    <div role={role} className={cn("flex items-start gap-3 rounded-md border p-4", styles[variant])}>
      <Icon size={20} className={cn("mt-0.5 shrink-0", iconColor[variant])} />
      <div className="text-sm leading-relaxed [&_strong]:font-semibold">{children}</div>
    </div>
  );
}
