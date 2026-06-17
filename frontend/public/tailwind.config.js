import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        // Brand tokens (Whistlevault — light premium)
        wv: {
          navy: "#0F172A",
          "navy-700": "#1E293B",
          "navy-600": "#334155",
          accent: "#2563EB",
          "accent-strong": "#1D4ED8",
          "accent-2": "#6366F1",
          "accent-tint": "#EEF4FF",
          surface2: "#F1F5F9",
          "border-strong": "#CBD5E1",
          success: "#0F9D6E",
          warning: "#D97706",
          danger: "#DC2626",
        },
        // shadcn semantic tokens (HSL via CSS vars)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        sans: ["Jakarta", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        // Soft, layered, navy-tinted premium elevation
        xs: "0 1px 2px rgba(15,23,42,0.05)",
        sm: "0 1px 2px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.04)",
        DEFAULT: "0 2px 4px rgba(15,23,42,0.04), 0 6px 16px -4px rgba(15,23,42,0.08)",
        md: "0 4px 8px -2px rgba(15,23,42,0.06), 0 12px 28px -6px rgba(15,23,42,0.12)",
        lg: "0 12px 24px -8px rgba(15,23,42,0.12), 0 24px 48px -12px rgba(15,23,42,0.18)",
        glow: "0 0 0 1px rgba(37,99,235,0.18), 0 8px 24px -6px rgba(37,99,235,0.30)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [animate],
};
