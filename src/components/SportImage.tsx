import type { Modality } from "@/lib/db/types";

// Sport graphics per modality (lift = barbell, core = stopwatch).
const SRC: Record<Modality, string> = {
  run: "/sport-run.png",
  bike: "/sport-bike.png",
  swim: "/sport-swim.png",
  row: "/sport-row.png",
  lift: "/sport-strength.png",
  core: "/sport-core.png",
};

/** Renders the photo for a modality at a fixed square size. */
export default function SportImage({
  modality,
  size = 24,
  className = "",
}: {
  modality: Modality;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[modality]}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
