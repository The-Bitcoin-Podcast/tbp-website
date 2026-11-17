import Link from "next/link";
import { sponsorHref, type Sponsor } from "@/lib/sponsors";

/** A sponsor's logo, or the first letter of their name when there is no logo yet. */
export function SponsorMark({
  sponsor,
  size = "md",
}: {
  sponsor: Pick<Sponsor, "name" | "logo">;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg" ? "h-20 w-20 text-3xl" : size === "sm" ? "h-9 w-9 text-sm" : "h-14 w-14 text-xl";
  if (sponsor.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static export, no image optimizer
      <img
        src={sponsor.logo}
        alt=""
        className={`${box} shrink-0 rounded-xl border border-border bg-background object-contain ${size === "sm" ? "p-1" : "p-2"}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center rounded-xl bg-surface-light font-display font-extrabold text-foreground`}
    >
      {sponsor.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** "15 episodes · 2021" */
export function sponsorTally(sponsor: Pick<Sponsor, "episodes" | "years">): string | undefined {
  const count = sponsor.episodes.length;
  if (count === 0) return undefined;
  const label = `${count} ${count === 1 ? "episode" : "episodes"} sponsored`;
  return sponsor.years ? `${label} · ${sponsor.years}` : label;
}

/**
 * Outbound link to a sponsor's site: marked as paid, tagged for their analytics,
 * and counted as a `sponsor_click` in ours (see SponsorAnalytics).
 */
export function SponsorWebsiteLink({
  website,
  sponsor,
  slot,
  target,
  className,
  children,
}: {
  website: string;
  /** Sponsor name, as reported in analytics. */
  sponsor: string;
  /** Where the link sits: a placement id, or "sponsor-page". */
  slot: string;
  target?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={sponsorHref(website, slot, target)}
      target="_blank"
      rel="sponsored noopener"
      className={className}
      data-sponsor-event="sponsor_click"
      data-sponsor={sponsor}
      data-sponsor-slot={slot}
      data-sponsor-target={target}
    >
      {children}
    </a>
  );
}

export function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const tally = sponsorTally(sponsor);
  return (
    <Link href={`/sponsors/${encodeURIComponent(sponsor.slug)}`} className="card flex gap-4 p-5">
      <SponsorMark sponsor={sponsor} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display text-lg font-extrabold">{sponsor.name}</span>
          {sponsor.current && (
            <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              Current sponsor
            </span>
          )}
        </span>
        {sponsor.blurb && (
          <span className="mt-1 block text-[15px] leading-relaxed text-muted">{sponsor.blurb}</span>
        )}
        {tally && <span className="mt-2 block font-mono text-xs text-muted">{tally}</span>}
      </span>
    </Link>
  );
}
