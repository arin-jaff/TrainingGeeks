"use client";

import { useState } from "react";
import FilesModal from "./FilesModal";

/** "Files" button on the activity page that opens the attachments modal. */
export default function FilesButton({
  activityId,
}: {
  activityId: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-accent hover:text-accent"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        Files
      </button>
      {open && <FilesModal activityId={activityId} onClose={() => setOpen(false)} />}
    </>
  );
}
