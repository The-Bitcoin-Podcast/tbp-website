import Link from "next/link";

const siteLinks = [
  { label: "About", href: "/about" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "Business Tips", href: "/business-tips" },
];

const externalLinks = [
  { label: "YouTube", href: "https://youtube.com/@thebtcpodcast" },
  { label: "X", href: "https://twitter.com/thebtcpodcast" },
  { label: "Discord", href: "https://discord.gg/Gn4N7AdfhM" },
];

const linkClass = "text-muted transition-colors hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-4 px-6 pb-10 pt-7 text-[13px] text-muted sm:px-8">
        <span>&copy; {new Date().getFullYear()} The Bitcoin Podcast Network</span>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {siteLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
          <a href="/index.xml" className={linkClass}>
            RSS
          </a>
          {externalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
