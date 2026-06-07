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
        // Dark navy top navigation chrome (measured from TrainingPeaks)
        nav: {
          DEFAULT: "#161e2e",
          hover: "#232d42",
          active: "#0c1018",
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
        line: "#dce0e8", // card / divider borders (TP)
        ink: {
          DEFAULT: "#1a202e", // primary text (TP)
          muted: "#6b7280", // secondary text
        },
        // Performance metric boxes (Fatigue / Fitness / Form)
        fatigue: "#e15554",
        fitness: "#1f2d3d",
        form: "#f0a03f",
        // Per-modality accent colors for calendar cards / charts (TP-matched)
        modality: {
          run: "#45ae01",
          bike: "#2f6fed",
          swim: "#16a0c8",
          strength: "#7b2d8e",
          core: "#a42ddb",
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
