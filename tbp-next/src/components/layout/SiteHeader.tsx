"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Search clips", href: "/search" },
  { label: "Episodes", href: "/episodes" },
  { label: "Guests", href: "/people" },
  { label: "Reports", href: "/reports" },
  { label: "Newsletter", href: "/news" },
  { label: "About", href: "/about" },
];

const DISCORD_URL = "https://discord.gg/Gn4N7AdfhM";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-6 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 font-display text-lg font-extrabold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand">
            B
          </span>
          The Bitcoin Podcast
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-foreground px-[18px] py-2.5 font-semibold text-background transition-opacity hover:opacity-85"
          >
            Join Discord
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="-mr-2 rounded-full p-2.5 transition-colors hover:bg-surface-light lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            {mobileOpen ? (
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 8h16M4 16h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border px-6 pb-6 pt-2 lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block border-b border-border py-3.5 text-base font-medium text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-full bg-foreground px-5 py-3.5 text-center text-base font-semibold text-background"
          >
            Join Discord
          </a>
        </nav>
      )}
    </header>
  );
}
