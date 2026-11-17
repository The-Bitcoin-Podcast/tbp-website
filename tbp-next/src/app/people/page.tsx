import type { Metadata } from "next";
import Link from "next/link";
import { getAllPeople, summarize } from "@/lib/people";
import { PeopleDirectory } from "@/components/people/PeopleDirectory";
import { Avatar } from "@/components/people/PersonBits";

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
  const hosts = people.length - guests;
  const firstYear = people.map((p) => p.first).filter(Boolean).sort()[0]?.slice(0, 4);

  // A strip of faces for the header: frequent guests who have a photo.
  const faces = people
    .filter((p) => p.avatar && !p.host)
    .sort((a, b) => b.episodes.length - a.episodes.length)
    .slice(0, 9);

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

        {faces.length > 0 && (
          <div className="mt-8 flex justify-center -space-x-3" aria-hidden="true">
            {faces.map((p) => (
              <Avatar key={p.slug} name={p.name} src={p.avatar} size={44} className="ring-4 ring-background" />
            ))}
          </div>
        )}

        <dl className="mx-auto mt-8 grid max-w-xl grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface-light/60">
          {[
            [guests, "guests"],
            [hosts, "hosts"],
            [appearances, "appearances"],
          ].map(([n, label]) => (
            <div key={label} className="px-3 py-4">
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-2xl font-extrabold sm:text-3xl">{n.toLocaleString()}</dd>
              <dd className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-muted">{label}</dd>
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
