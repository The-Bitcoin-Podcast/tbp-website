import Link from "next/link";
import { getSponsorsFor, type SlotSponsor, type SponsorSlotName } from "@/lib/sponsors";
import { SponsorMark, SponsorWebsiteLink } from "./SponsorBits";

const LABELS: Record<SponsorSlotName, string> = {
  network: "The network is sponsored by",
  show: "This show is sponsored by",
  archive: "This show is sponsored by",
  episode: "This episode is sponsored by",
  newsletter: "The newsletter is sponsored by",
  reports: "Presented by",
  section: "Sponsored by",
};

interface SponsorSlotProps {
  slot: SponsorSlotName;
  /** Which show, episode file, issue or section this page is. See SponsorPlacement. */
  target?: string;
  /** Replaces the default "… is sponsored by" wording, which is also the paid-placement label. */
  label?: string;
  /** "strip" is a bordered row inside a page; "line" is one line of text for the footer. */
  variant?: "strip" | "line";
  className?: string;
}

function SponsorName({
  sponsor,
  slot,
  target,
  className,
}: {
  sponsor: SlotSponsor["sponsor"];
  slot: SponsorSlotName;
  target?: string;
  className?: string;
}) {
  return sponsor.website ? (
    <SponsorWebsiteLink
      website={sponsor.website}
      sponsor={sponsor.name}
      slot={slot}
      target={target}
      className={className}
    >
      {sponsor.name}
    </SponsorWebsiteLink>
  ) : (
    <Link href={`/sponsors/${encodeURIComponent(sponsor.slug)}`} className={className}>
      {sponsor.name}
    </Link>
  );
}

/**
 * Names whoever sponsors this spot, from the `placements` in content/sponsors.
 * Renders nothing when the spot has no sponsor, so it is safe to leave on any page.
 */
export async function SponsorSlot({
  slot,
  target,
  label = LABELS[slot],
  variant = "strip",
  className = "",
}: SponsorSlotProps) {
  const sponsors = await getSponsorsFor(slot, target);
  if (sponsors.length === 0) return null;

  // Read by SponsorAnalytics, which reports a `sponsor_impression` when this scrolls into view.
  const viewed = (name: string) => ({
    "data-sponsor-view": "",
    "data-sponsor": name,
    "data-sponsor-slot": slot,
    "data-sponsor-target": target,
  });

  if (variant === "line") {
    return (
      <p className={className}>
        {label}{" "}
        {sponsors.map(({ sponsor }, index) => (
          <span key={sponsor.slug} {...viewed(sponsor.name)}>
            {index > 0 && (index === sponsors.length - 1 ? " and " : ", ")}
            <SponsorName
              sponsor={sponsor}
              slot={slot}
              target={target}
              className="font-semibold text-foreground underline-offset-2 hover:underline"
            />
          </span>
        ))}
      </p>
    );
  }

  return (
    <aside
      aria-label="Sponsor"
      className={`rounded-2xl border border-border bg-surface-light/60 px-5 py-4 ${className}`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {sponsors.map(({ sponsor, message }) => (
          <li key={sponsor.slug} className="flex items-center gap-3" {...viewed(sponsor.name)}>
            <SponsorMark sponsor={sponsor} size="sm" />
            <p className="min-w-0 text-[15px] leading-snug">
              <SponsorName
                sponsor={sponsor}
                slot={slot}
                target={target}
                className="font-semibold underline-offset-2 hover:underline"
              />
              {(message ?? sponsor.blurb) && (
                <span className="text-muted"> · {message ?? sponsor.blurb}</span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
