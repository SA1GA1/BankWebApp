/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bank: {
          DEFAULT: "#0f5fef",
          dark: "#0a3fa8",
        },
      },
    },
  },
  plugins: [],
};
