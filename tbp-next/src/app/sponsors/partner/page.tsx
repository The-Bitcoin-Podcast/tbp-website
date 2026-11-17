import type { Metadata } from "next";
import Link from "next/link";
import { getAllEpisodeFrontmatter, getLandingConfig } from "@/lib/content";
import { buildEpisodeIndex, buildShowSummaries } from "@/lib/episode-index";
import { getAllPeople } from "@/lib/people";
import { PLACEMENTS, getAllSponsors, getSponsorPageConfig } from "@/lib/sponsors";
import { SponsorMark, sponsorTally } from "@/components/sponsors/SponsorBits";
import { SponsorInquiry } from "@/components/sponsors/SponsorInquiry";

export const metadata: Metadata = {
  title: "Sponsor the network",
  description:
    "Sponsor The Bitcoin Podcast Network: a show, an episode, the weekly newsletter or a part of the site.",
};

const STEPS = [
  ["Tell us what you're promoting", "A product, a launch, an event or a hiring push, and when it needs to land."],
  ["We suggest the placements", "You get a short proposal: where you'd appear, for how long and what it costs."],
  ["You go live", "We write the read with you, put your name on the site and send you the links."],
];

/** Opens the hosted payment or booking page set for a placement or package. */
function BookingLink({ href, item }: { href: string; item: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-85"
      data-sponsor-event="sponsor_booking_start"
      data-sponsor-slot={item}
    >
      Book now <span aria-hidden="true">&rarr;</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default async function SponsorPartnerPage() {
  const config = getSponsorPageConfig();
  const sponsors = await getAllSponsors();

  const shows = buildShowSummaries(buildEpisodeIndex());
  const totalEpisodes = getAllEpisodeFrontmatter().length;
  const hours = shows.reduce((sum, show) => sum + show.hours, 0);
  const guests = getAllPeople().filter((person) => !person.host).length;
  const firstYear = Math.min(...shows.map((show) => show.firstYear));
  // Shows with a real back catalog get a tile; one-offs are counted in the line below.
  const featuredShows = shows.filter((show) => show.count >= 10).slice(0, 6);

  const catalog = [
    { value: totalEpisodes.toLocaleString(), label: "episodes" },
    { value: shows.length.toLocaleString(), label: "shows" },
    { value: hours.toLocaleString(), label: "hours recorded" },
    { value: guests.toLocaleString(), label: "guests" },
  ];
  const stats = [...config.audience, ...catalog];

  return (
    <>
      <div className="mx-auto max-w-[1160px] px-6 py-12 sm:px-8 sm:py-16">
        <header className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            Sponsorship · On air since {firstYear}
          </p>
          <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-6xl">
            Sponsor The Bitcoin Podcast Network
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Reach people who build, trade and write about crypto. Sponsor one episode, a whole
            show, the weekly newsletter or a part of this site.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#inquire"
              className="rounded-full bg-brand px-7 py-4 text-base font-semibold text-foreground transition-colors hover:bg-brand-hover"
            >
              Get in touch
            </a>
            <a
              href="#placements"
              className="rounded-full border border-foreground px-7 py-4 text-base font-semibold transition-colors hover:bg-surface-light"
            >
              See the placements
            </a>
          </div>
        </header>

        <dl className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface-light px-4 py-6 text-center">
              <dd className="font-display text-3xl font-extrabold">{stat.value}</dd>
              <dt className="mt-1 text-[13px] text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>

        <section id="placements" aria-labelledby="placements-heading" className="mt-20 scroll-mt-24">
          <h2 id="placements-heading" className="font-display text-3xl font-extrabold sm:text-4xl">
            What you can sponsor
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            Seven placements, from a single episode to the whole network. Mix them however suits
            your campaign.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PLACEMENTS.map((placement) => (
              <article key={placement.id} className="flex flex-col rounded-2xl border border-border p-6">
                <h3 className="font-display text-xl font-extrabold">{placement.name}</h3>
                <p className="mt-3 text-[15px] leading-relaxed">{placement.where}</p>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{placement.why}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="font-mono text-xs text-muted">
                    {config.rates[placement.id] ?? "Rates on request"}
                  </p>
                  {config.booking[placement.id] && (
                    <BookingLink href={config.booking[placement.id]} item={placement.id} />
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="shows-heading" className="mt-20">
          <h2 id="shows-heading" className="font-display text-3xl font-extrabold sm:text-4xl">
            Shows you can sponsor
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            Each show has its own audience. Sponsor one that is still recording, or the archive of
            one that has wrapped.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredShows.map((show) => (
              <li key={show.slug} className="rounded-2xl border border-border p-5">
                <span
                  aria-hidden="true"
                  className="block h-1.5 w-10 rounded-full"
                  style={{ backgroundColor: show.color }}
                />
                <h3 className="mt-4 font-display text-lg font-extrabold">{show.name}</h3>
                {show.tagline && (
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">{show.tagline}</p>
                )}
                <p className="mt-3 font-mono text-xs text-muted">
                  {show.count.toLocaleString()} episodes ·{" "}
                  {show.firstYear === show.lastYear
                    ? show.firstYear
                    : `${show.firstYear}–${show.lastYear}`}
                </p>
              </li>
            ))}
          </ul>
          {shows.length > featuredShows.length && (
            <p className="mt-5 text-[15px] text-muted">
              Plus {shows.length - featuredShows.length} more in{" "}
              <Link href="/episodes" className="font-semibold text-accent hover:text-accent-hover">
                the archive
              </Link>
              .
            </p>
          )}
        </section>

        {config.packages.length > 0 && (
          <section aria-labelledby="packages-heading" className="mt-20">
            <h2 id="packages-heading" className="font-display text-3xl font-extrabold sm:text-4xl">
              Packages
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {config.packages.map((pack) => (
                <article key={pack.name} className="flex flex-col rounded-2xl bg-surface-light p-6">
                  <h3 className="font-display text-xl font-extrabold">{pack.name}</h3>
                  {pack.price && <p className="mt-1 font-mono text-sm text-accent">{pack.price}</p>}
                  {pack.summary && (
                    <p className="mt-3 text-[15px] leading-relaxed text-muted">{pack.summary}</p>
                  )}
                  {pack.includes.length > 0 && (
                    <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
                      {pack.includes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {pack.bookingUrl && (
                    <p className="mt-auto pt-5">
                      <BookingLink href={pack.bookingUrl} item={pack.name} />
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {sponsors.length > 0 && (
          <section aria-labelledby="past-heading" className="mt-20">
            <h2 id="past-heading" className="font-display text-3xl font-extrabold sm:text-4xl">
              Who has sponsored us
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sponsors.map((sponsor) => (
                <li key={sponsor.slug}>
                  <Link
                    href={`/sponsors/${encodeURIComponent(sponsor.slug)}`}
                    className="card flex items-center gap-4 p-4"
                  >
                    <SponsorMark sponsor={sponsor} />
                    <span className="min-w-0">
                      <span className="block font-display text-lg font-extrabold">{sponsor.name}</span>
                      <span className="block font-mono text-xs text-muted">
                        {sponsorTally(sponsor)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="steps-heading" className="mt-20">
          <h2 id="steps-heading" className="font-display text-3xl font-extrabold sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(([title, body], index) => (
              <li key={title}>
                <span className="font-mono text-sm text-accent">0{index + 1}</span>
                <h3 className="mt-2 font-display text-xl font-extrabold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-3xl rounded-2xl bg-surface-light p-6 text-[15px] leading-relaxed">
            <strong>Sponsored means labelled.</strong> Every paid placement is marked as
            sponsored, on air and on the site. Sponsors don&rsquo;t choose our guests or what we
            say about them.
          </p>
        </section>
      </div>

      <section
        id="inquire"
        aria-labelledby="inquire-heading"
        className="scroll-mt-20 bg-foreground py-16 text-background"
      >
        <div className="mx-auto grid max-w-[1160px] gap-10 px-6 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="inquire-heading" className="font-display text-3xl font-extrabold sm:text-[34px]">
              Let&rsquo;s talk
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#b8b8b4]">
              Tell us what you&rsquo;re promoting and we&rsquo;ll come back with placements that
              fit and what they cost.
            </p>
          </div>
          <SponsorInquiry
            formAction={config.inquiryFormAction}
            contactEmail={config.contactEmail}
            discordUrl={getLandingConfig().discordUrl}
          />
        </div>
      </section>
    </>
  );
}
