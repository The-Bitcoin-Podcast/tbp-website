import type { Metadata } from "next";
import data from "@/data/predictions.json";
import { PredictionBoard } from "@/components/predictions/PredictionBoard";
import { TallyBar } from "@/components/predictions/TallyBar";
import {
  SUBJECT_LABEL,
  VERDICT_META,
  VERDICT_ORDER,
  pct,
  tally,
  type Prediction,
} from "@/components/predictions/types";

export const metadata: Metadata = {
  title: "Prediction Scorecard",
  description:
    "Every forecast made on The Bitcoin Podcast network since 2015, graded against what actually happened, with the clip and the sources.",
};

const GRADED_ON = "November 2026";

function Highlight({ p }: { p: Prediction }) {
  const m = VERDICT_META[p.verdict];
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: m.ink }}>
        {p.date.slice(0, 4)} · {m.label}
      </p>
      <p className="mt-1 font-display font-bold leading-snug">{p.headline}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">“{p.quote}”</p>
    </li>
  );
}

export default function PredictionsPage() {
  const all = data as Prediction[];
  const total = tally(all);
  const firstYear = all[0]?.date.slice(0, 4);
  const lastYear = all.at(-1)?.date.slice(0, 4);

  const byYear = [...new Set(all.map((p) => p.date.slice(0, 4)))].map((year) => ({
    label: year,
    t: tally(all.filter((p) => p.date.startsWith(year))),
  }));
  const bySubject = [...new Set(all.map((p) => p.subject))]
    .map((s) => ({ label: SUBJECT_LABEL[s] ?? s, t: tally(all.filter((p) => p.subject === s)) }))
    .filter((r) => r.t.graded >= 5)
    .sort((a, b) => (b.t.score ?? 0) - (a.t.score ?? 0));

  const bold = (v: Prediction["verdict"]) =>
    all
      .filter((p) => p.verdict === v && p.confidence !== "low")
      .sort((a, b) => (b.boldness ?? 0) - (a.boldness ?? 0) || a.date.localeCompare(b.date))
      .slice(0, 3);

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-12 sm:px-8 sm:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
          Keeping score · {firstYear}–{lastYear}
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-6xl">Prediction Scorecard</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          A decade of hosts and guests saying what crypto would look like next. We went back through the
          archive, pulled out every specific, checkable forecast, and graded each one against what
          actually happened. The good calls, the bad ones, and the ones still in play.
        </p>
      </header>

      <section className="mx-auto mt-12 max-w-4xl rounded-3xl border border-border bg-surface-light p-6 sm:p-10">
        <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
          <div className="text-center sm:text-left">
            <p className="font-display text-7xl font-extrabold leading-none sm:text-8xl">{pct(total.score)}</p>
            <p className="mt-2 text-sm text-muted">
              accuracy across {total.graded} graded calls
            </p>
          </div>
          <div>
            <TallyBar t={total} height={18} />
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {VERDICT_ORDER.map((v) => (
                <div key={v} className="rounded-xl bg-surface p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: VERDICT_META[v].fill }} aria-hidden />
                    {VERDICT_META[v].label}
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-extrabold">{total[v]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          Accuracy counts a hit as 1 and a partly-right call as ½, over every call that has resolved. Calls
          that are still open aren’t counted either way. Graded {GRADED_ON}.
        </p>
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Best calls</h2>
          <p className="mt-1 text-sm text-muted">Bold at the time, and right.</p>
          <ul className="mt-4 grid gap-3">
            {bold("hit").map((p) => (
              <Highlight key={p.id} p={p} />
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-2xl font-extrabold">Biggest misses</h2>
          <p className="mt-1 text-sm text-muted">Said with confidence, and wrong.</p>
          <ul className="mt-4 grid gap-3">
            {bold("miss").map((p) => (
              <Highlight key={p.id} p={p} />
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <Breakdown title="By year the call was made" rows={byYear} />
        <Breakdown title="By topic" rows={bySubject} />
      </section>

      <PredictionBoard predictions={all} />

      <section className="mx-auto mt-20 max-w-3xl rounded-2xl border border-border p-6 text-sm leading-relaxed text-muted sm:p-8">
        <h2 className="font-display text-xl font-extrabold text-foreground">How we graded</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            We searched the transcripts of every episode for forward-looking statements, kept only ones
            specific enough to check, and matched each quote word for word to its spot in the episode.
          </li>
          <li>
            Each call was checked against public sources: price history, project announcements,
            regulators’ filings and news coverage. Every grade links to its sources.
          </li>
          <li>
            <strong className="text-foreground">Called it</strong> means it happened as said, on time if a
            deadline was given. <strong className="text-foreground">Partly right</strong> means the
            direction was right but the size, timing or a key detail was off.{" "}
            <strong className="text-foreground">Missed</strong> means it didn’t happen or the deadline
            passed. <strong className="text-foreground">Still open</strong> means it can’t be judged yet.
          </li>
          <li>
            Forecasts the hosts merely relayed from someone else, jokes and hypotheticals are left out.
            Speaker names are shown only where the recording makes them clear.
          </li>
          <li>
            Think a grade is wrong? Tell us on Discord and we’ll re-check it. Transcripts are machine-made,
            so play the clip before quoting anyone.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; t: ReturnType<typeof tally> }[] }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">{title}</h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            <th className="pb-2 font-normal" />
            <th className="w-full pb-2 font-normal" />
            <th className="pb-2 pl-3 text-right font-normal">Calls</th>
            <th className="pb-2 pl-3 text-right font-normal">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-border">
              <td className="whitespace-nowrap py-2.5 pr-3 font-medium">{r.label}</td>
              <td className="py-2.5">
                <TallyBar t={r.t} />
              </td>
              <td className="py-2.5 pl-3 text-right font-mono text-muted">{r.t.hit + r.t.partial + r.t.miss + r.t.pending}</td>
              <td className="py-2.5 pl-3 text-right font-mono font-semibold">{pct(r.t.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
