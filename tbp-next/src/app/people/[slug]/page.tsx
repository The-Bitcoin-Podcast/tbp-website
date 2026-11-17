import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllPeople, getPerson, type PersonEpisode } from "@/lib/people";
import { getShowMeta } from "@/lib/show-meta";
import { formatDate } from "@/lib/content";
import { Avatar, SocialIcon, linkEntries } from "@/components/people/PersonBits";
import tenWords from "@/data/ten-words.json";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPeople().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const person = getPerson(decodeURIComponent(slug));
  if (!person) return { title: "Person Not Found" };
  const n = person.episodes.length;
  return {
    title: person.name,
    description:
      person.bio ||
      `${person.name}${person.affiliation ? `, ${person.affiliation},` : ""} on The Bitcoin Podcast Network: ${n} episode${n === 1 ? "" : "s"}.`,
    openGraph: person.avatar ? { images: [{ url: person.avatar }] } : undefined,
  };
}

interface TenWordsMoment {
  id: string;
  slug: string;
  question: string;
  subject?: string;
  answer: string;
  answeredBy?: string;
  date: string;
  episode: string;
}

const QUESTION_LABEL: Record<string, string> = {
  ten: "In ten words or less",
  hard: "Is what you do hard?",
  ask: "What didn't we ask?",
};

function EpisodeRow({ episode }: { episode: PersonEpisode }) {
  const show = getShowMeta(episode.show);
  return (
    <li>
      <Link
        href={`/episodes/${episode.slug}`}
        className="group flex items-center gap-4 rounded-xl border border-transparent p-2.5 transition-colors hover:border-border hover:bg-surface-light/60"
      >
        {episode.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={episode.thumbnail}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            className="h-16 w-16 flex-shrink-0 rounded-lg bg-surface-light object-cover"
          />
        ) : (
          <span
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: show.color }}
          >
            {show.short}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold leading-snug group-hover:text-accent">{episode.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span
              className="rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: show.color }}
            >
              {show.short}
            </span>
            <span className="font-mono">{formatDate(episode.date)}</span>
            {episode.role === "host" && <span className="font-mono">· hosting</span>}
          </p>
        </div>
        <svg
          className="h-4 w-4 flex-shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </li>
  );
}

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = getPerson(decodeURIComponent(slug));
  if (!person) notFound();

  const links = linkEntries(person.links, { withOther: true });
  const answers = (tenWords as TenWordsMoment[]).filter((m) => m.answeredBy === person.name);
  const guestEps = person.episodes.filter((e) => e.role === "guest");
  const hostEps = person.episodes.filter((e) => e.role === "host");
  const shows = person.hosted.length ? person.hosted : person.shows;
  const span =
    person.first && person.last
      ? person.first.slice(0, 4) === person.last.slice(0, 4)
        ? person.first.slice(0, 4)
        : `${person.first.slice(0, 4)}–${person.last.slice(0, 4)}`
      : undefined;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8 sm:py-16">
      <nav className="mb-10 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="transition-colors hover:text-accent">
          Home
        </Link>
        <span>/</span>
        <Link href="/people" className="transition-colors hover:text-accent">
          Guests &amp; Hosts
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{person.name}</span>
      </nav>

      {/* Profile header */}
      <header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar name={person.name} src={person.avatar} size={112} className="ring-4 ring-brand-tint" />
        <div className="min-w-0 flex-1">
          {person.host && (
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
              Host · {shows.map((s) => getShowMeta(s).short).join(" · ")}
            </p>
          )}
          <h1 className="mt-1 font-display text-4xl font-extrabold sm:text-5xl">{person.name}</h1>
          {person.affiliation && <p className="mt-2 text-lg text-foreground/80">{person.affiliation}</p>}
          {person.bio && person.bio !== person.affiliation && (
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">{person.bio}</p>
          )}
          <p className="mt-4 font-mono text-sm text-muted">
            {person.episodes.length} episode{person.episodes.length === 1 ? "" : "s"}
            {span && ` · ${span}`}
            {answers.length > 0 && ` · ${answers.length} In Ten Words answer${answers.length === 1 ? "" : "s"}`}
          </p>

          {links.length > 0 && (
            <ul className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              {links.map(([kind, href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-brand hover:bg-brand-tint/40 hover:text-accent-hover"
                  >
                    <SocialIcon kind={kind} className="h-4 w-4" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {/* In Ten Words */}
      {answers.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-extrabold">In their words</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {answers.map((a) => (
              <figure key={a.id} className="rounded-2xl border border-border bg-surface-light/60 p-5">
                <figcaption className="font-mono text-[11px] uppercase tracking-wider text-accent">
                  {QUESTION_LABEL[a.question] || a.question}
                  {a.question === "ten" && a.subject ? `: ${a.subject}` : ""}
                </figcaption>
                <blockquote className="mt-2 font-display text-lg font-semibold leading-snug">
                  &ldquo;{a.answer}&rdquo;
                </blockquote>
                <p className="mt-3 text-xs text-muted">
                  <Link href={`/episodes/${a.slug}`} className="hover:text-accent">
                    {a.episode}
                  </Link>{" "}
                  · {a.date.slice(0, 4)}
                </p>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Episodes */}
      {guestEps.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-extrabold">{person.host ? "As a guest" : "Episodes"}</h2>
            <span className="font-mono text-xs text-muted">{guestEps.length}</span>
          </div>
          <ul className="mt-4 -mx-2.5 space-y-1">
            {guestEps.map((e) => (
              <EpisodeRow key={e.slug} episode={e} />
            ))}
          </ul>
        </section>
      )}

      {hostEps.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-extrabold">Hosted</h2>
            <span className="font-mono text-xs text-muted">{hostEps.length}</span>
          </div>
          <ul className="mt-4 -mx-2.5 space-y-1">
            {hostEps.map((e) => (
              <EpisodeRow key={e.slug} episode={e} />
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14 border-t border-border/50 pt-8">
        <Link
          href="/people"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          All guests &amp; hosts
        </Link>
      </div>
    </div>
  );
}
