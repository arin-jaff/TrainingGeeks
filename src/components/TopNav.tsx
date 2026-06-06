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
      <div className="mx-auto flex h-12 items-center px-4">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 pr-8">
          <span className="text-[15px] font-bold tracking-tight">
            TRAINING<span className="text-accent">GEEKS</span>
          </span>
        </Link>

        {/* Center tabs */}
        <nav className="flex h-full items-stretch gap-1">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center px-3 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-nav-active text-white"
                    : "text-white/70 hover:bg-nav-hover hover:text-white",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: athlete */}
        <div className="ml-auto flex items-center gap-3 text-[13px] text-white/80">
          <span className="hidden sm:inline">Arin Jaff</span>
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[12px] font-semibold text-white"
          >
            AJ
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
