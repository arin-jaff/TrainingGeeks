"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { GITHUB_URL } from "@/lib/constants";
import { BellIcon, GearIcon, GitHubIcon, ThreeBarsIcon, XIcon } from "@/components/icons";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/atp", label: "ATP" },
  // Social is an opt-in, sectioned-off experience — never affects personal use.
  { href: "/social", label: "Social" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TopNav({
  showSignOut = false,
  userName = "Athlete",
  readOnly = false,
}: {
  showSignOut?: boolean;
  userName?: string;
  readOnly?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);

  // On the read-only demo "/" is the public landing page and the athlete
  // home lives at /home — point every home link there.
  const homeHref = readOnly ? "/home" : "/";
  const tabs = readOnly
    ? TABS.map((t) => (t.href === "/" ? { ...t, href: homeHref } : t))
    : TABS;

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const tabClass = (active: boolean) =>
    [
      "rounded px-3 py-1.5 text-[13px] font-medium transition-colors",
      active ? "bg-nav-active text-white" : "text-white/70 hover:text-white",
    ].join(" ");

  return (
    <header className="bg-nav text-white">
      <div className="relative mx-auto flex h-12 items-center px-4">
        {/* Mobile menu button (small screens only) */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="mr-2 -ml-1 rounded p-1.5 text-white/80 hover:bg-white/10 md:hidden"
        >
          {menuOpen ? <XIcon size={18} /> : <ThreeBarsIcon size={18} />}
        </button>

        {/* Wordmark (left) */}
        <Link href={homeHref} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={22} height={22} className="rounded" />
          <span className="text-[15px] font-bold tracking-tight">
            TRAINING<span className="text-accent">GEEKS</span>
          </span>
        </Link>

        {/* Tabs (centered, md+ only) */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(pathname, tab.href) ? "page" : undefined}
              className={tabClass(isActive(pathname, tab.href))}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3 text-[13px] text-white/85">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            title="TrainingGeeks is open source — star it on GitHub"
            className="hidden items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[12px] font-medium text-white/85 hover:border-white/40 hover:text-white sm:flex"
          >
            <GitHubIcon size={15} />
            GitHub
          </a>
          <Link href="/settings" aria-label="Account settings" title="Account settings">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/avatar.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-full bg-white/15 object-cover ring-white/40 transition hover:ring-2"
            />
          </Link>
          <span className="hidden sm:inline">{userName}</span>
          {readOnly ? (
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-medium text-white/70">
              Read-only demo
            </span>
          ) : (
            <>
              <span aria-hidden className="text-white/50" title="Notifications">
                <BellIcon size={16} />
              </span>
              <Link
                href="/settings"
                className="text-white/60 hover:text-white"
                title="Settings"
                aria-label="Settings"
              >
                <GearIcon size={16} />
              </Link>
            </>
          )}
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

      {/* Mobile dropdown menu (small screens) */}
      {menuOpen && (
        <nav className="border-t border-white/10 px-2 py-2 md:hidden">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(pathname, tab.href) ? "page" : undefined}
              className={`block ${tabClass(isActive(pathname, tab.href))}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
