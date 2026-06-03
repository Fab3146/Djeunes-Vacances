import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        muted: "#64717f",
        paper: "#f8f6ef",
        linen: "#efe7d8",
        lagoon: "#126b64",
        coral: "#df644a",
        marigold: "#e9ad30",
        moss: "#6e8f4f"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(23, 33, 43, 0.10)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
