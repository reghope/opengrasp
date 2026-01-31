import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7ff",
          100: "#dce9ff",
          200: "#b6d2ff",
          300: "#7fb0ff",
          400: "#4686ff",
          500: "#2a62ff",
          600: "#1e4ad6",
          700: "#1a3aa9",
          800: "#1b3485",
          900: "#1b2f6b"
        }
      }
    }
  },
  plugins: []
};

export default config;
