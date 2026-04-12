import type { Config } from "tailwindcss";

/** X / Twitter–inspired dark surfaces (approximate official palette) */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        accent: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        /** X “Lights out” / dark UI */
        tw: {
          bg: "#000000",
          card: "#16181c",
          raised: "#1c1f26",
          border: "#2f3336",
          text: "#e7e9ea",
          muted: "#71767b",
          blue: "#1d9bf0",
          "blue-hover": "#1a8cd8",
          dim: "#0f1419",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 80px -20px rgba(79, 70, 229, 0.35)",
        "glow-dark": "0 0 60px -20px rgba(29, 155, 240, 0.2)",
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(99, 102, 241, 0.22), transparent 55%), radial-gradient(ellipse 80% 50% at 100% 0%, rgba(6, 182, 212, 0.12), transparent 50%), radial-gradient(ellipse 60% 40% at 0% 20%, rgba(79, 70, 229, 0.15), transparent 45%)",
        "hero-mesh-dark":
          "radial-gradient(ellipse 100% 70% at 50% -25%, rgba(29, 155, 240, 0.14), transparent 55%), radial-gradient(ellipse 80% 55% at 100% 0%, rgba(22, 24, 28, 0.95), transparent 52%), radial-gradient(ellipse 55% 45% at 0% 25%, rgba(29, 155, 240, 0.08), transparent 48%)",
      },
    },
  },
  plugins: [],
};

export default config;
