// Inline stroke icons (Lucide-style, stroke 1.75, currentColor). No emoji, one family.
import { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ShieldCheck = (p: P) => (
  <Svg {...p}>
    <path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const Lock = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const EyeOff = (p: P) => (
  <Svg {...p}>
    <path d="M10.7 6.2A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.3 2.9" />
    <path d="M6.6 6.6A16 16 0 0 0 3 12s4 6 9 6a9.5 9.5 0 0 0 4.5-1.1" />
    <path d="m2 2 20 20" />
  </Svg>
);

export const Scale = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v18" />
    <path d="M7 21h10" />
    <path d="m5 7 14-2" />
    <path d="m6 6-3 6a3 3 0 0 0 6 0Z" />
    <path d="m18 5-3 6a3 3 0 0 0 6 0Z" />
  </Svg>
);

export const Check = (p: P) => (
  <Svg {...p}>
    <path d="m5 12 4.5 4.5L19 7" />
  </Svg>
);

export const ArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);

export const FileIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14 3v5h5" />
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
  </Svg>
);

export const Info = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </Svg>
);

export const Alert = (p: P) => (
  <Svg {...p}>
    <path d="M10.3 4 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const Mic = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </Svg>
);

export const Stop = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Svg>
);

export const Copy = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Svg>
);

export const KeyRound = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="10" r="5" />
    <path d="m12.5 11.5 8 8" />
    <path d="m17 16 2-2" />
    <path d="m19.5 18.5 2-2" />
  </Svg>
);

export const MessageIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1Z" />
  </Svg>
);

export const PenLine = (p: P) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </Svg>
);

/** Whistlevault brand mark: shield + vault/gem facets (original, owned). */
export const VaultMark = (p: P) => (
  <Svg {...p}>
    <path d="M12 2.3 20 5.4V11c0 5-3.4 8.3-8 9.6C7.4 19.3 4 16 4 11V5.4Z" />
    <path d="M6.7 8.7 9 4.7 12 8.7 15 4.7 17.3 8.7" />
    <path d="M6.7 8.7 12 20" />
    <path d="M17.3 8.7 12 20" />
    <path d="M12 8.7V20" />
    <path d="M9.2 14.2H14.8" />
  </Svg>
);
