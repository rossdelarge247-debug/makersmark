import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display, var(--font-sans))", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        // Primary accent — CSS variable driven, switches per theme
        primary: {
          50:  "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
          950: "var(--color-primary-950)",
        },
        // Neutral grays — consistent with premium SaaS
        neutral: {
          0:   "#ffffff",
          50:  "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)",
          950: "var(--neutral-950)",
        },
      },
      borderRadius: {
        sm:      "0.375rem",
        DEFAULT: "0.5rem",
        md:      "0.625rem",
        lg:      "0.75rem",
        xl:      "1rem",
        "2xl":   "1.25rem",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
      },
      boxShadow: {
        card:       "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        elevated:   "var(--shadow-elevated)",
        modal:      "var(--shadow-modal)",
      },
      typography: {
        DEFAULT: { css: { maxWidth: "none" } },
      },
    },
  },
  plugins: [],
};

export default config;
