import type { Config } from "tailwindcss";

/**
 * Design tokens derived from the TrainingPeaks reference screenshots
 * (references/tp-ui/). Clean, sharp, data-dense. No emojis.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark navy top navigation chrome
        nav: {
          DEFAULT: "#0f1b33",
          hover: "#1b2a47",
          active: "#26395c",
        },
        // Primary action blue (links, buttons, accents)
        accent: {
          DEFAULT: "#2f6fed",
          hover: "#2257c9",
        },
        // App surfaces
        surface: {
          DEFAULT: "#f4f5f7", // page background
          card: "#ffffff",
        },
        line: "#e5e7eb", // card / divider borders
        ink: {
          DEFAULT: "#1f2937", // primary text
          muted: "#6b7280", // secondary text
        },
        // Performance metric boxes (Fatigue / Fitness / Form)
        fatigue: "#e15554",
        fitness: "#1f2d3d",
        form: "#f0a03f",
        // Per-modality accent colors for calendar cards / charts
        modality: {
          run: "#2f9e6b",
          bike: "#2f6fed",
          swim: "#16a0c8",
          strength: "#8b5cf6",
          core: "#d97706",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
