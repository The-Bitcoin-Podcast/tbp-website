import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/content";
import { getAllSponsors, getSponsor } from "@/lib/sponsors";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { SponsorMark, SponsorWebsiteLink, sponsorTally } from "@/components/sponsors/SponsorBits";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getAllSponsors()).map((sponsor) => ({ slug: sponsor.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sponsor = await getSponsor(decodeURIComponent(slug));
  return { title: sponsor?.name ?? "Sponsor", description: sponsor?.blurb };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sponsor = await getSponsor(decodeURIComponent(slug));
  if (!sponsor) notFound();

  const tally = sponsorTally(sponsor);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <nav className="mb-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="transition-colors hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/sponsors" className="transition-colors hover:text-accent">Sponsors</Link>
      </nav>

      <header className="flex items-start gap-5">
        <SponsorMark sponsor={sponsor} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{sponsor.name}</h1>
          {tally && <p className="mt-2 font-mono text-xs text-muted">{tally}</p>}
        </div>
      </header>

      {sponsor.blurb && <p className="mt-6 text-lg leading-relaxed">{sponsor.blurb}</p>}

      {sponsor.website && (
        <SponsorWebsiteLink
          website={sponsor.website}
          className="mt-6 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85"
        >
          Visit {sponsor.name}
        </SponsorWebsiteLink>
      )}

      {sponsor.bodyHtml && <MarkdownContent html={sponsor.bodyHtml} className="mt-8" />}

      {sponsor.episodes.length > 0 && (
        <section aria-labelledby="episodes-heading" className="mt-12">
          <h2 id="episodes-heading" className="font-display text-2xl font-extrabold">
            Sponsored episodes
          </h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {sponsor.episodes.map((episode) => (
              <li key={episode.href}>
                <Link href={episode.href} className="group block py-4">
                  <span className="block font-semibold transition-colors group-hover:text-accent">
                    {episode.title}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {episode.show} · {formatDate(episode.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-sm font-semibold">
        <Link href="/sponsors" className="text-accent transition-colors hover:text-accent-hover">
          &larr; All sponsors
        </Link>
        <Link href="/sponsors/partner" className="text-accent transition-colors hover:text-accent-hover">
          Sponsor the network &rarr;
        </Link>
      </div>
    </div>
  );
}
