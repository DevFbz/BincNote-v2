/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca — lavanda/roxo suave do AppFlowy
        brand: {
          50: "#f3f2ff",
          100: "#e9e7ff",
          200: "#d6d3ff",
          300: "#b8b3ff",
          400: "#9a8fff",
          500: "#7c6df5",
          600: "#6451e0",
          700: "#5340c2",
          800: "#43339d",
          900: "#372b7e",
        },
        // Superfícies — CSS variables for dark mode support
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          4: "var(--surface-4)",
          dark1: "var(--surface-dark1)",
          dark2: "var(--surface-dark2)",
          dark3: "var(--surface-dark3)",
          dark4: "var(--surface-dark4)",
        },
        // Texto — CSS variables for dark mode support
        txt: {
          DEFAULT: "var(--txt)",
          muted: "var(--txt-muted)",
          faint: "var(--txt-faint)",
        },
        // Acento/ação
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        divider: "var(--divider)",
        danger: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
      },
      boxShadow: {
        card: "var(--card-shadow)",
        pop: "var(--pop-shadow)",
      },
    },
  },
  plugins: [],
};