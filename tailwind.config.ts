import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        qfr: {
          black: "#07090c",
          panel: "#10151b",
          elevated: "#171e27",
          line: "#28313c",
          muted: "#9ba6b2",
          accent: "#b8a4ff"
        }
      }
    }
  },
  plugins: []
};
export default config;
