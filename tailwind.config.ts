import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bbx: {
          bg: "#0a0a0a",          // page background
          panel: "#101010",       // card / panel
          panel2: "#161616",      // raised cell
          line: "#1f1f1f",        // hairline border
          lineSoft: "#171717",
          dim: "#6b6b6b",         // muted label
          text: "#e6e6e6",        // primary text
          subtext: "#9ca3af",     // secondary text
          accent: "#ff7a1a",      // burnt orange
          accentSoft: "#ff7a1a26",
          accentDim: "#ff7a1a14",
          good: "#3fb950",
          warn: "#d29922",
          bad: "#f85149",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
        sans: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      letterSpacing: {
        bbx: "0.18em",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop": {
          "0%": { transform: "scale(0)" },
          "70%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "scan": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "caret": {
          "0%,49%": { opacity: "1" },
          "50%,100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
        "pop": "pop 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "scan": "scan 2.4s ease-in-out infinite",
        "caret": "caret 1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
