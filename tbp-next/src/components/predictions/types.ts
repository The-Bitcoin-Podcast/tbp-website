export type Verdict = "hit" | "partial" | "miss" | "pending";

export interface Prediction {
  id: string;
  slug: string;
  show: string;
  episode: string;
  date: string;
  start: number;
  quote: string;
  claim: string;
  headline: string;
  speaker: string;
  role: "host" | "guest" | "";
  subject: string;
  horizon: string | null;
  boldness: number | null;
  verdict: Verdict;
  confidence: "high" | "medium" | "low";
  outcome: string;
  resolved: string | null;
  sources: { title: string; url: string }[];
  audioUrl?: string;
  youtubeId?: string;
}

/** Verdict colors: fills for bars and badges, a darker ink for text on white. */
export const VERDICT_META: Record<Verdict, { label: string; fill: string; ink: string; tint: string }> = {
  hit: { label: "Called it", fill: "#16a34a", ink: "#166534", tint: "#dcfce7" },
  partial: { label: "Partly right", fill: "#f59e0b", ink: "#92400e", tint: "#fef3c7" },
  miss: { label: "Missed", fill: "#dc2626", ink: "#991b1b", tint: "#fee2e2" },
  pending: { label: "Still open", fill: "#a3a3a3", ink: "#525252", tint: "#f4f4f2" },
};

export const VERDICT_ORDER: Verdict[] = ["hit", "partial", "miss", "pending"];

export const SUBJECT_LABEL: Record<string, string> = {
  price: "Price",
  markets: "Markets",
  adoption: "Adoption",
  technology: "Technology",
  regulation: "Regulation",
  projects: "Projects & companies",
  security: "Security",
  other: "Other",
};

export interface Tally {
  hit: number;
  partial: number;
  miss: number;
  pending: number;
  /** Graded calls: everything except pending. */
  graded: number;
  /** Hits count 1, partials 0.5, over graded calls. Null when nothing is graded. */
  score: number | null;
}

export function tally(list: Prediction[]): Tally {
  const t = { hit: 0, partial: 0, miss: 0, pending: 0 };
  for (const p of list) t[p.verdict]++;
  const graded = t.hit + t.partial + t.miss;
  return { ...t, graded, score: graded ? (t.hit + t.partial / 2) / graded : null };
}

export const pct = (score: number | null) => (score === null ? "–" : `${Math.round(score * 100)}%`);
