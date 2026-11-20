import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "var(--bg-canvas)",
          surface: "var(--bg-surface)",
          card: "var(--bg-card)",
          hover: "var(--bg-card-hover)",
        },
        border: {
          subtle: "var(--border-subtle)",
          medium: "var(--border-medium)",
          focus: "var(--border-focus)",
        },
        alpenglow: {
          DEFAULT: "var(--accent-alpenglow)",
          hover: "var(--accent-alpenglow-hover)",
          glow: "var(--accent-alpenglow-glow)",
        },
        mist: {
          DEFAULT: "var(--accent-mist)",
          muted: "var(--accent-mist-muted)",
        },
        duskerror: {
          DEFAULT: "var(--accent-error)",
          muted: "var(--accent-error-muted)",
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        floating: "var(--shadow-floating)",
        alpenglow: "var(--glow-alpenglow)",
      },
      transitionTimingFunction: {
        dusk: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseMist: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.2)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-mist": "pulseMist 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

