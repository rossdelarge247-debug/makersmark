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
      },
      colors: {
        // Neutral grays — semantic surface tokens
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Primary accent — slate-blue palette
        primary: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a5bbfd",
          400: "#8197fb",
          500: "#6172f3",
          600: "#4e55e8",
          700: "#3f43d0",
          800: "#3437a8",
          900: "#2f3584",
          950: "#1e1f50",
        },
        // Neutral grays — consistent with premium SaaS
        neutral: {
          0: "#ffffff",
          50: "#f8f9fa",
          100: "#f1f3f5",
          200: "#e9ecef",
          300: "#dee2e6",
          400: "#ced4da",
          500: "#adb5bd",
          600: "#868e96",
          700: "#495057",
          800: "#343a40",
          900: "#212529",
          950: "#0d0f12",
        },
      },
      borderRadius: {
        sm: "0.375rem",   // 6px
        DEFAULT: "0.5rem", // 8px
        md: "0.625rem",   // 10px
        lg: "0.75rem",    // 12px
        xl: "1rem",       // 16px
        "2xl": "1.25rem", // 20px
      },
      spacing: {
        // Extend spacing for consistent layout rhythm
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
      },
      boxShadow: {
        // Soft, premium shadows — no harsh borders
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        elevated:
          "0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
        modal:
          "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
