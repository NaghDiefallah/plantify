import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        accent: "hsl(var(--accent))",
        /** Lumaris design system — single source of truth */
        lumaris: {
          green:   "#4DA751",
          lime:    "#C8E43B",
          dark:    "#020202",
          surface: "#09090b",
          tile:    "#0d0d10",
          border:  "#1c1c1f",
          muted:   "#2f2f34"
        },
        /** Material Design 3 tokens */
        "on-background":                "#e5e2e1",
        "background":                   "#141313",
        "surface":                      "#141313",
        "surface-dim":                  "#141313",
        "surface-bright":               "#3a3939",
        "surface-container-lowest":     "#0e0e0e",
        "surface-container-low":        "#1c1b1b",
        "surface-container":            "#201f1f",
        "surface-container-high":       "#2a2a2a",
        "surface-container-highest":    "#353434",
        "surface-variant":              "#353434",
        "surface-tint":                 "#7fdb7e",
        "on-surface":                   "#e5e2e1",
        "on-surface-variant":           "#bfcab9",
        "inverse-surface":              "#e5e2e1",
        "inverse-on-surface":           "#313030",
        "primary":                      "#7fdb7e",
        "primary-container":            "#4da751",
        "primary-fixed":                "#9af897",
        "primary-fixed-dim":            "#7fdb7e",
        "on-primary":                   "#00390b",
        "on-primary-container":         "#00360a",
        "on-primary-fixed":             "#002204",
        "on-primary-fixed-variant":     "#005315",
        "inverse-primary":              "#056e1f",
        "secondary":                    "#bdd82f",
        "secondary-container":          "#a2bc03",
        "secondary-fixed":              "#d3ef46",
        "secondary-fixed-dim":          "#b7d328",
        "on-secondary":                 "#2c3400",
        "on-secondary-container":       "#3d4800",
        "on-secondary-fixed":           "#181e00",
        "on-secondary-fixed-variant":   "#404c00",
        "tertiary":                     "#ffb1c7",
        "tertiary-container":           "#e56d96",
        "tertiary-fixed":               "#ffd9e2",
        "tertiary-fixed-dim":           "#ffb1c7",
        "on-tertiary":                  "#640231",
        "on-tertiary-container":        "#5f002e",
        "on-tertiary-fixed":            "#3f001c",
        "on-tertiary-fixed-variant":    "#831f48",
        "error":                        "#ffb4ab",
        "error-container":              "#93000a",
        "on-error":                     "#690005",
        "on-error-container":           "#ffdad6",
        "outline":                      "#899485",
        "outline-variant":              "#3f493d"
      },
      fontFamily: {
        headline: ["Inter", "var(--font-geist-sans)", "sans-serif"],
        body:     ["Inter", "var(--font-geist-sans)", "sans-serif"],
        label:    ["Space Grotesk", "sans-serif"],
        mono:     ["var(--font-geist-mono)", "Geist Mono", "monospace"]
      },
      borderWidth: {
        "0.5": "0.5px"
      },
      borderRadius: {
        xl:   "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem"
      },
      boxShadow: {
        tile:       "inset 0 0 0 0.5px rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.5)",
        "tile-hover": "inset 0 0 0 0.5px rgba(200,228,59,0.6), 0 20px 45px rgba(0,0,0,0.45)",
        lime:        "0 0 20px rgba(200,228,59,0.25)",
        "lime-lg":   "0 0 36px rgba(200,228,59,0.35)",
        green:       "0 0 20px rgba(77,167,81,0.25)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" }
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        fadeSlideUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        float:        "float 6s ease-in-out infinite",
        shimmer:      "shimmer 2.2s linear infinite",
        fadeSlideUp:  "fadeSlideUp 0.35s ease-out forwards"
      }
    }
  },
  plugins: []
};

export default config;
