import data from "@/data/people.json";
import type { PersonLinks } from "@/components/people/PersonBits";
import type { PersonSummary } from "@/components/people/PeopleDirectory";

/** One person's appearance on an episode. Built by scripts/people/build.mjs. */
export interface PersonEpisode {
  slug: string;
  show: string;
  title: string;
  date: string;
  thumbnail?: string;
  role: "guest" | "host";
}

export interface Person {
  name: string;
  slug: string;
  host: boolean;
  hosted: string[];
  affiliation?: string;
  bio?: string;
  links: PersonLinks;
  avatar?: string;
  tenWords: number;
  shows: string[];
  first?: string;
  last?: string;
  episodes: PersonEpisode[];
}

const people = data as Person[];

export function getAllPeople(): Person[] {
  return people;
}

export function getPerson(urlSlug: string): Person | undefined {
  return people.find((p) => p.slug === urlSlug || encodeURIComponent(p.slug) === urlSlug);
}

/** The index page doesn't need every episode, only the counts. */
export function summarize(p: Person): PersonSummary {
  const { episodes, ...rest } = p;
  return { ...rest, count: episodes.length };
}
