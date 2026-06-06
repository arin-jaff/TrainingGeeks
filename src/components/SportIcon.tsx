import type { Modality } from "@/lib/db/types";
import { MODALITY_COLOR } from "@/lib/util/colors";

/** Small line icon per sport, colored by modality (TrainingPeaks-style). */
export default function SportIcon({
  modality,
  size = 16,
}: {
  modality: Modality;
  size?: number;
}) {
  const color = MODALITY_COLOR[modality];
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (modality) {
    case "bike":
      return (
        <svg {...common} aria-hidden>
          <circle cx="5.5" cy="17" r="3.5" />
          <circle cx="18.5" cy="17" r="3.5" />
          <path d="M5.5 17l4-7h5l3 7M9.5 10l2-3h3" />
        </svg>
      );
    case "swim":
      return (
        <svg {...common} aria-hidden>
          <circle cx="17" cy="7" r="1.6" />
          <path d="M3 14c2 0 2 1.5 4 1.5S11 14 13 14s2 1.5 4 1.5 2-1.5 4-1.5" />
          <path d="M5 11l5 2 4-4 4 2" />
        </svg>
      );
    case "lift":
      return (
        <svg {...common} aria-hidden>
          <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
        </svg>
      );
    case "core":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="13" r="7" />
          <path d="M12 13V9M10 2h4" />
        </svg>
      );
    case "run":
    default:
      return (
        <svg {...common} aria-hidden>
          <circle cx="15.5" cy="5" r="1.8" />
          <path d="M13 9l-3 2 2 3-2 5M14 9l3 1 .5 3M9 13l-3 1" />
        </svg>
      );
  }
}
