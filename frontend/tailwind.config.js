/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bank: {
          primary: "#0b2545",
          "primary-dark": "#061a36",
          accent: "#1d6ff0",
          "accent-soft": "#e6effc",
          surface: "#ffffff",
          bg: "#f4f6fa",
          border: "#e2e8f0",
          muted: "#64748b",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 37, 69, 0.04), 0 4px 16px rgba(11, 37, 69, 0.06)",
      },
    },
  },
  plugins: [],
};
