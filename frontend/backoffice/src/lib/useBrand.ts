import { useEffect, useState } from "react";

// Tenant brand name from the public config (same-origin, no auth). Used by the
// backoffice chrome so the product name is data-driven per tenant instead of
// hardcoded. Neutral fallback keeps the UI white-label until the config loads.
let cached: string | null = null;

export function useBrand(): string {
  const [name, setName] = useState<string>(cached ?? "Segnalazioni");
  useEffect(() => {
    if (cached) {
      setName(cached);
      return;
    }
    fetch("/api/public")
      .then((r) => r.json())
      .then((cfg) => {
        const n = cfg?.branding?.name;
        if (n) {
          cached = n;
          setName(n);
        }
      })
      .catch(() => {});
  }, []);
  return name;
}
