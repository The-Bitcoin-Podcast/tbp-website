export interface PersonLinks {
  website?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  nostr?: string;
  youtube?: string;
  instagram?: string;
  mastodon?: string;
  farcaster?: string;
  bluesky?: string;
  other?: string[];
}

/* ─── Social links ─────────────────────────────────────────────────────── */

const ICONS: Record<string, React.ReactNode> = {
  twitter: <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z" />,
  github: (
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
  ),
  linkedin: (
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  ),
  youtube: (
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
  ),
  website: (
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 6h-2.95a15.6 15.6 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8ZM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96ZM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4H4.26Zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.07 16Zm2.95-8H5.07a7.99 7.99 0 0 1 4.33-3.56A15.6 15.6 0 0 0 8.02 8ZM12 19.96A14.1 14.1 0 0 1 10.09 16h3.82A14.1 14.1 0 0 1 12 19.96ZM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4Zm.26 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56ZM16.36 14a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4h-3.38Z" />
  ),
  link: (
    <path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.4-3.4a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0Zm-2.83 6.36a4 4 0 0 1-2.83-6.83l2.12-2.12a1 1 0 0 1 1.42 1.41l-2.13 2.12a2 2 0 0 0 2.83 2.83l2.12-2.12a1 1 0 1 1 1.42 1.41l-2.13 2.13a3.98 3.98 0 0 1-2.82 1.17Zm7.07-7.07a1 1 0 0 1-.7-1.7l2.12-2.13a2 2 0 0 0-2.83-2.83l-2.12 2.13a1 1 0 0 1-1.42-1.42l2.13-2.12a4 4 0 0 1 5.65 5.65l-2.12 2.13a1 1 0 0 1-.71.29Z" />
  ),
};

const LABELS: Record<string, string> = {
  twitter: "X / Twitter",
  github: "GitHub",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  website: "Website",
  nostr: "Nostr",
  instagram: "Instagram",
  mastodon: "Mastodon",
  farcaster: "Farcaster",
  bluesky: "Bluesky",
};

const ORDER = ["website", "twitter", "github", "linkedin", "youtube", "nostr", "bluesky", "farcaster", "mastodon", "instagram"];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function nostrHref(value: string): string {
  return value.startsWith("npub") ? `https://njump.me/${value}` : value;
}

/** Ordered list of [kind, url, label] for a person's links. */
export function linkEntries(links: PersonLinks, { withOther = false } = {}): [string, string, string][] {
  const out: [string, string, string][] = [];
  for (const kind of ORDER) {
    const value = links[kind as keyof PersonLinks];
    if (typeof value === "string" && value) {
      const href = kind === "nostr" ? nostrHref(value) : value;
      const label =
        kind === "website"
          ? hostOf(value)
          : kind === "twitter"
            ? `@${value.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "")}`
            : LABELS[kind];
      out.push([kind, href, label]);
    }
  }
  if (withOther) for (const url of links.other || []) out.push(["link", url, hostOf(url)]);
  return out;
}

export function SocialIcon({ kind, className = "h-4 w-4" }: { kind: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {ICONS[kind] || ICONS.link}
    </svg>
  );
}

/** Compact row of icon-only links, for cards. */
export function SocialIconRow({ links, name }: { links: PersonLinks; name: string }) {
  const entries = linkEntries(links);
  if (entries.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {entries.slice(0, 4).map(([kind, href]) => (
        <a
          key={kind}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${name} on ${LABELS[kind] || kind}`}
          aria-label={`${name} on ${LABELS[kind] || kind}`}
          className="relative z-10 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-light hover:text-accent"
        >
          <SocialIcon kind={kind} className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}

export { Avatar } from "./Avatar";
