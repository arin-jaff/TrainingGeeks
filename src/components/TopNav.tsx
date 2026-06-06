"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/atp", label: "ATP" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TopNav({ showSignOut = false }: { showSignOut?: boolean }) {
  const pathname = usePathname() ?? "/";

  return (
    <header className="bg-nav text-white">
      <div className="relative mx-auto flex h-12 items-center px-4">
        {/* Wordmark (left) */}
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={22} height={22} className="rounded" />
          <span className="text-[15px] font-bold tracking-tight">
            TRAINING<span className="text-accent">GEEKS</span>
          </span>
        </Link>

        {/* Tabs (centered) */}
        <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:text-white",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3 text-[13px] text-white/85">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[12px] font-semibold text-white"
          >
            AJ
          </span>
          <span className="hidden sm:inline">Arin Jaff</span>
          <span aria-hidden className="text-white/50" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></svg>
          </span>
          {showSignOut && (
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-white/60 hover:text-white"
                title="Sign out"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
