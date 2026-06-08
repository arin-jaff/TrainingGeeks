"use client";

import { createContext, useContext, type ReactNode } from "react";

const ReadOnlyContext = createContext(false);

/** Provides the read-only/demo flag to client components below the layout. */
export function ReadOnlyProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return <ReadOnlyContext.Provider value={value}>{children}</ReadOnlyContext.Provider>;
}

/** True when the instance is in read-only/demo mode — hide edit affordances. */
export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}
