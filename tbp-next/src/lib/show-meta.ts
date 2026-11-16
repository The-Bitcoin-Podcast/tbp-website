/**
 * Display details for each show folder in content/episodes/<show>.
 * Safe to import from client components (no fs).
 */
export interface ShowMeta {
  name: string;
  /** Short label for badges on episode cards. */
  short: string;
  tagline: string;
  /** Accent used for the show's tile, badge and banner. */
  color: string;
}

const SHOW_META: Record<string, ShowMeta> = {
  tbp: {
    name: "The Bitcoin Podcast",
    short: "TBP",
    tagline: "The flagship show: Bitcoin, blockchain and the people building it.",
    color: "#f7931a",
  },
  hio: {
    name: "Hashing It Out",
    short: "HIO",
    tagline: "Technical deep dives with the builders behind the infrastructure.",
    color: "#2563eb",
  },
  "an-ethereum-podcast": {
    name: "An Ethereum Podcast",
    short: "AEP",
    tagline: "Conversations from across the Ethereum community.",
    color: "#6d28d9",
  },
  "dee-weekly": {
    name: "Dee Weekly",
    short: "Dee",
    tagline: "A weekly rundown of the crypto news that mattered.",
    color: "#db2777",
  },
  "taptrade-tv": {
    name: "TapTrade.TV",
    short: "TapTrade",
    tagline: "Markets and trading talk.",
    color: "#059669",
  },
  conferences: {
    name: "Conference Talks",
    short: "Talks",
    tagline: "Talks recorded on stage at conferences.",
    color: "#0891b2",
  },
  shorts: {
    name: "Shorts",
    short: "Shorts",
    tagline: "Bite-sized clips from the network.",
    color: "#dc2626",
  },
  unboxing: {
    name: "Unboxing",
    short: "Unboxing",
    tagline: "Hardware and gear, opened on camera.",
    color: "#7c3aed",
  },
};

export function getShowMeta(slug: string, title?: string): ShowMeta {
  const known = SHOW_META[slug];
  if (known) return known;
  const name = title || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { name, short: name, tagline: "", color: "#5c5c5c" };
}
