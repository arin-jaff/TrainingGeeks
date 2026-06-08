import type { ReactNode } from "react";

export { GITHUB_URL } from "@/lib/constants";
import { GITHUB_URL } from "@/lib/constants";

/**
 * Friendly full-bleed status screen (coming-soon, 404, error) with a frown
 * image and a link to the project's GitHub.
 */
export default function StatusScreen({
  frown = 1,
  eyebrow,
  title,
  message,
  githubLabel = "View on GitHub",
  children,
}: {
  frown?: 1 | 2 | 3;
  eyebrow?: string;
  title: string;
  message: ReactNode;
  githubLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[62vh] flex-col items-center justify-center px-4 py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/frown-${frown}.png`}
        alt=""
        width={150}
        height={150}
        className="mb-6 h-[150px] w-[150px] object-contain opacity-90 drop-shadow-sm"
      />
      {eyebrow && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
          {eyebrow}
        </p>
      )}
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <div className="mt-2 max-w-md text-sm text-ink-muted">{message}</div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {children}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded border border-line bg-surface-card px-4 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/github.png" alt="" width={16} height={16} className="h-4 w-4" />
          {githubLabel}
        </a>
      </div>
    </div>
  );
}
