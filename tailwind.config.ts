import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-secondary": "var(--bg-secondary)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        primary: "var(--primary)",
        danger: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
    },
  },
  plugins: [],
} satisfies Config;
