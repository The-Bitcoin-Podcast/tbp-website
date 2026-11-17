import type { Metadata } from "next";
import Link from "next/link";
import { getAllSponsors } from "@/lib/sponsors";
import { SponsorCard } from "@/components/sponsors/SponsorBits";

export const metadata: Metadata = {
  title: "Sponsors",
  description:
    "The companies that have sponsored The Bitcoin Podcast Network, and how to become one.",
};

export default async function SponsorsPage() {
  const sponsors = await getAllSponsors();
  const current = sponsors.filter((sponsor) => sponsor.current);
  const others = sponsors.filter((sponsor) => !sponsor.current);

  return (
    <div className="mx-auto max-w-[1160px] px-6 py-12 sm:px-8 sm:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-5xl font-extrabold sm:text-6xl">Sponsors</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          The companies that help keep the network recording. Thank you to every one of them.
        </p>
      </header>

      {current.length > 0 && (
        <section aria-labelledby="current-heading" className="mt-12">
          <h2 id="current-heading" className="font-display text-2xl font-extrabold">
            Current sponsors
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {current.map((sponsor) => (
              <SponsorCard key={sponsor.slug} sponsor={sponsor} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="sponsors-heading" className="mt-12">
          <h2 id="sponsors-heading" className="font-display text-2xl font-extrabold">
            {current.length > 0 ? "Sponsors over the years" : "Who has sponsored us"}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {others.map((sponsor) => (
              <SponsorCard key={sponsor.slug} sponsor={sponsor} />
            ))}
          </div>
        </section>
      )}

      <section
        aria-labelledby="partner-heading"
        className="mt-14 flex flex-col gap-6 rounded-2xl bg-foreground p-8 text-background sm:p-10 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h2 id="partner-heading" className="font-display text-3xl font-extrabold">
            Put your name here
          </h2>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-[#b8b8b4]">
            Sponsor a show, an episode, the newsletter or a part of this site.
          </p>
        </div>
        <Link
          href="/sponsors/partner"
          className="self-start rounded-full bg-brand px-7 py-4 text-base font-semibold text-foreground transition-colors hover:bg-brand-hover lg:self-auto"
        >
          See what you can sponsor
        </Link>
      </section>
    </div>
  );
}
