import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fcf2f8",
          100: "#f8ddec",
          200: "#f1bbd8",
          400: "#e16fad",
          500: "#d84192",
          600: "#c6297e",
          700: "#941f5e",
          900: "#4c1030",
        },
        accent: "#8a1257",
        surface: "#ffffff",
        canvas: "#f5f8fa",
        ink: "#0f172a",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)",
        float: "0 8px 30px rgba(15,23,42,0.12)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeIn: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        fadeIn: "fadeIn .35s ease both",
        shimmer: "shimmer 1.4s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
