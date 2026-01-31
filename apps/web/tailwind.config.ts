import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'IBM Plex Sans'", "sans-serif"]
      },
      colors: {
        ink: {
          50: "#f7f6f1",
          100: "#ebe7da",
          200: "#d9cfb1",
          300: "#c0b081",
          400: "#a18d55",
          500: "#866f3b",
          600: "#6b572d",
          700: "#554426",
          800: "#3f341f",
          900: "#2f2618"
        },
        tide: {
          50: "#f0fbff",
          100: "#d8f2ff",
          200: "#a9e3ff",
          300: "#6cc8ff",
          400: "#2fa6ff",
          500: "#1183ff",
          600: "#0b63d6",
          700: "#0c4ea9",
          800: "#0e417f",
          900: "#0e355f"
        }
      }
    }
  },
  plugins: []
};

export default config;
