# Prediction mining brief

You are extracting **forecasts** from excerpts of The Bitcoin Podcast network archive (shows: TBP, Hashing It Out, An Ethereum Podcast), 2015–2024. Each excerpt block starts with `=== EPISODE slug=... date=... title=...` followed by transcript lines `[seconds] text`. `...` marks skipped transcript. Transcripts are Whisper output: speaker names are not marked and spelling may be off.

## What counts
A prediction is a statement, made on air, about something that had **not yet happened** at the episode date, that is **specific enough to grade today (November 2026)** as right or wrong. Examples that qualify:
- prices or market caps ("bitcoin will hit 100k by 2020", "ether will flip bitcoin")
- launches and timelines ("proof of stake ships next year", "Lightning will be usable in 6 months")
- adoption ("a major bank will hold bitcoin", "ETF approved within two years")
- regulation, lawsuits, company/project fates ("Bitfinex will collapse", "Tezos will never launch")
- technology outcomes ("sharding will deliver 1000x", "quantum won't threaten ECDSA within 10 years")

Exclude: vague sentiment ("crypto is the future", "eventually it'll matter"), hypotheticals and jokes, statements about the present or past, sponsor reads, and questions. When in doubt about specificity, leave it out. Quality over quantity: typically 0–4 per episode.

## Output
Write ONE JSON file (an array) with the Write tool to the output path you were given. Each element:

```json
{
  "slug": "tbp/123-...",             // exactly as in the EPISODE header
  "date": "2017-03-14",              // the episode date from the header
  "start": 1234.5,                   // seconds of the line where the prediction begins
  "quote": "verbatim words from the excerpt, 8-45 words, copied exactly",
  "claim": "Standalone, dated paraphrase: 'In March 2017 a host predicted that ... by 2020.'",
  "speaker": "host" | "guest" | a name ONLY if the excerpt itself makes it unambiguous,
  "subject": "price" | "adoption" | "technology" | "regulation" | "projects" | "markets" | "security" | "other",
  "assets": ["BTC","ETH",...],       // tickers/projects involved, may be empty
  "horizon": "2020-12-31" | null,    // the deadline implied by the speaker, ISO date, null if open-ended
  "boldness": 1 | 2 | 3              // 3 = contrarian or very specific at the time, 1 = consensus
}
```

Rules: `quote` must be copied character-for-character from one or two adjacent excerpt lines (do not fix spelling). Do not invent context beyond the excerpt. If a batch yields nothing, write `[]`. Do not grade the predictions; another pass does that. Reply with only the count you wrote.
