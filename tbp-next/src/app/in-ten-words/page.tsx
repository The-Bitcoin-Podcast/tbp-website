import type { Metadata } from "next";
import moments from "@/data/ten-words.json";
import { TenWordsTimeline, type TenWordsMoment } from "@/components/ten-words/TenWordsTimeline";

export const metadata: Metadata = {
  title: "In Ten Words",
  description:
    "Every guest's answer to the show's signature questions, from 2015 to today: in ten words or less, is what you do hard, and what didn't we ask?",
};

export default function InTenWordsPage() {
  const all = moments as TenWordsMoment[];
  const guests = new Set(all.map((m) => m.answeredBy || m.slug));
  const firstYear = all[0]?.date.slice(0, 4);
  const lastYear = all.at(-1)?.date.slice(0, 4);

  return (
    <div className="mx-auto max-w-[1160px] px-6 py-12 sm:px-8 sm:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          The trademark questions · {firstYear}–{lastYear}
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-6xl">In Ten Words</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Near the end of almost every interview, the hosts ask the same question:{" "}
          <em className="text-foreground">“In ten words or less, can you describe Bitcoin?”</em> Later
          came two more: <em className="text-foreground">“Is what you do hard?”</em> and{" "}
          <em className="text-foreground">“Is there anything you wanted us to ask that we didn’t?”</em>{" "}
          Here is every answer we could find, in order, with the clip.
        </p>
        <p className="mt-6 font-mono text-sm text-muted">
          {all.length.toLocaleString()} answers · {guests.size.toLocaleString()} voices
        </p>
      </header>
      <TenWordsTimeline moments={all} />
    </div>
  );
}
