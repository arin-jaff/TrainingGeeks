import type { ReactNode } from "react";

/**
 * Branded empty-state placeholder: a line-art "upward trend in a card" mark
 * with a title and optional supporting copy / action. Used wherever a panel
 * has no data yet (no activities, no bests, no events, etc.).
 */
export default function EmptyState({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}
    >
      <TrendMark />
      <p className="mt-4 text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function TrendMark() {
  return (
    <svg
      width="120"
      height="84"
      viewBox="0 0 200 140"
      fill="none"
      role="img"
      aria-hidden="true"
    >
      {/* card */}
      <rect
        x="20"
        y="16"
        width="160"
        height="108"
        rx="10"
        stroke="#dce0e8"
        strokeWidth="2"
      />
      {/* header bar */}
      <line x1="20" y1="42" x2="180" y2="42" stroke="#dce0e8" strokeWidth="2" />
      <circle cx="34" cy="29" r="3" fill="#dce0e8" />
      <rect x="44" y="26" width="46" height="6" rx="3" fill="#dce0e8" />
      {/* trend area */}
      <path
        d="M40 104 L74 86 L102 92 L130 64 L160 52 L160 110 L40 110 Z"
        fill="#1840ec"
        fillOpacity="0.08"
      />
      {/* trend line */}
      <polyline
        points="40,104 74,86 102,92 130,64 160,52"
        stroke="#1840ec"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* nodes */}
      {[
        [40, 104],
        [74, 86],
        [102, 92],
        [130, 64],
      ].map(([cx, cy]) => (
        <circle key={`${cx}`} cx={cx} cy={cy} r="3" fill="#fff" stroke="#1840ec" strokeWidth="2" />
      ))}
      {/* peak marker */}
      <circle cx="160" cy="52" r="5" fill="#1840ec" />
    </svg>
  );
}
