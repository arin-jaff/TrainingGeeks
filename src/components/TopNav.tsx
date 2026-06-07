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
          <img src="/logo.png" alt="" width={22} height={22} className="rounded" />
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
                    ? "bg-nav-active text-white"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/avatar.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full bg-white/15 object-cover"
          />
          <span className="hidden sm:inline">Arin Jaff</span>
          <span aria-hidden className="text-white/50" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></svg>
          </span>
          <Link
            href="/settings"
            className="text-white/60 hover:text-white"
            title="Settings"
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 01-4 0v-.1A1.7 1.7 0 005 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 13.6H3a2 2 0 010-4h.1A1.7 1.7 0 004.6 5l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V1a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H23a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>
          </Link>
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
