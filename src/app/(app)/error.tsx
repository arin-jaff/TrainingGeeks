"use client";

import StatusScreen, { GITHUB_URL } from "@/components/StatusScreen";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusScreen
      frown={1}
      eyebrow="Error"
      title="Something went wrong!"
      message={
        <>
          That page hit an unexpected error
          {error?.digest ? ` (ref ${error.digest})` : ""}. You can try again, or
          report it on GitHub so we can fix it.
        </>
      }
      githubLabel="Report on GitHub"
    >
      <button
        onClick={reset}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Try again
      </button>
      <a
        href={`${GITHUB_URL}/issues/new`}
        target="_blank"
        rel="noreferrer"
        className="rounded border border-line bg-surface-card px-4 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent"
      >
        Report an issue
      </a>
    </StatusScreen>
  );
}
