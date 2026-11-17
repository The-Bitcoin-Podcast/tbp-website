import type { Metadata } from "next";
import Link from "next/link";
import { getAllPeople, summarize } from "@/lib/people";
import { isRegularHost } from "@/lib/hosts";
import { PeopleDirectory } from "@/components/people/PeopleDirectory";
import { FeaturedGuests, type FeaturedGuest } from "@/components/people/FeaturedGuests";
import type { TenWordsMoment } from "@/components/ten-words/TenWordsTimeline";
import tenWords from "@/data/ten-words.json";

export const metadata: Metadata = {
  title: "Guests & Hosts",
  description:
    "Every guest and host who has appeared on The Bitcoin Podcast Network since 2015, with their episodes, projects and where to find them.",
};

export default function PeoplePage() {
  const people = getAllPeople();
  const summaries = people.map(summarize);
  const appearances = people.reduce((n, p) => n + p.episodes.length, 0);
  const guests = people.filter((p) => !p.host).length;
  const hosts = summaries.filter(isRegularHost).length;
  const guestHosts = people.length - guests - hosts;
  const firstYear = people.map((p) => p.first).filter(Boolean).sort()[0]?.slice(0, 4);

  // Faces for the header: every guest with a photo. The strip shows nine at a
  // time and rotates through the rest; those who answered the ten-words
  // question lead, since clicking a face plays their answer back.
  const moments = tenWords as TenWordsMoment[];
  const featured: FeaturedGuest[] = people
    .filter((p) => p.avatar && !p.host)
    .map((p) => {
      const answer = moments
        .filter((m) => m.answeredBy === p.name && m.question === "ten" && m.words <= 16)
        .sort((a, b) => Number(b.highlight) - Number(a.highlight) || a.words - b.words)[0];
      const latest = [...p.episodes].sort((a, b) => b.date.localeCompare(a.date))[0];
      const a = p.first?.slice(0, 4);
      const b = p.last?.slice(0, 4) || a;
      return {
        name: p.name,
        slug: p.slug,
        avatar: p.avatar!,
        affiliation: p.affiliation,
        count: p.episodes.length,
        years: a ? (a === b ? a : `${a}–${b}`) : undefined,
        quote: answer && {
          subject: answer.subject,
          answer: answer.answer,
          words: answer.words,
          episode: answer.episode,
          slug: answer.slug,
          start: answer.start,
          end: answer.end,
          audioUrl: answer.audioUrl,
        },
        latest: latest && { title: latest.title, slug: latest.slug, show: latest.show },
      };
    })
    .sort((a, b) => Number(Boolean(b.quote)) - Number(Boolean(a.quote)) || b.count - a.count);

  return (
    <div className="mx-auto max-w-[1160px] px-6 py-12 sm:px-8 sm:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          The people behind the episodes · {firstYear}–today
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-6xl">Guests &amp; Hosts</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Builders, cryptographers, founders, artists and skeptics: everyone who has sat down with
          us across the network. Find a guest, see every episode they&rsquo;re on, and follow them
          where they post now.
        </p>

        {featured.length > 0 && <FeaturedGuests pool={featured} />}

        <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-surface-light/60">
          {[
            [guests, "guests"],
            [hosts, "hosts"],
            [guestHosts, "guest hosts"],
            [appearances, "appearances"],
          ].map(([n, label]) => (
            <div key={label} className="px-2 py-4 sm:px-3">
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-xl font-extrabold sm:text-3xl">{n.toLocaleString()}</dd>
              <dd className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted sm:text-[11px]">{label}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-sm text-muted">
          Hear what they said in ten words or less on{" "}
          <Link href="/in-ten-words" className="font-semibold text-accent hover:text-accent-hover">
            In Ten Words →
          </Link>
        </p>
      </header>

      <PeopleDirectory people={summaries} />
    </div>
  );
}
