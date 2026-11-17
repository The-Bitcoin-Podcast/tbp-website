# Prediction grading brief

You are grading forecasts made on The Bitcoin Podcast network (2015–2024) against what actually happened. **Today is 2026-11-17.** These grades will be published on the show's own website as a public scorecard, so they must be fair, sourced, and never flattering by default. A miss graded as a miss is as valuable as a hit.

## Input
A JSON array of predictions. Each has an `id`, the episode `date`, a `claim` (paraphrase), and a verbatim `quote`. Some have a `horizon` (deadline the speaker implied).

## How to grade
For each prediction, use WebSearch (and WebFetch when a page is needed) to establish what happened. Prefer primary or high-quality sources: official project blogs/docs, exchange or on-chain data (CoinGecko, CoinMarketCap, Blockchain.com, Etherscan, ultrasound.money), regulators (SEC, CFTC), Reuters/Bloomberg/CoinDesk/The Block. Price history: use CoinGecko/CoinMarketCap historical data.

Judge the **quote** first, the claim second. If the paraphrase overstates the quote, grade what was actually said. Interpret deadlines the way a reasonable listener would have at the time. If no deadline is given and the event has happened, grade it; if it has not happened and the thing is still plausibly open, it is `pending`.

Verdicts (pick one):
- `hit`: it happened substantially as said, on time if a deadline was stated.
- `partial`: directionally right but wrong on size, timing, or a key detail (e.g. right event, two years late).
- `miss`: it did not happen, or the deadline passed, or the opposite happened.
- `pending`: deadline not reached or open-ended and still undecided.
- `ungradeable`: on reflection too vague, a joke, a hypothetical, or not actually a prediction. Use sparingly but honestly.

## Output
Write ONE JSON file (array, same order) with the Write tool to the output path you were given. Each element:

```json
{
  "id": "copied from input",
  "verdict": "hit" | "partial" | "miss" | "pending" | "ungradeable",
  "confidence": "high" | "medium" | "low",
  "outcome": "1–2 sentences, plain and specific, with dates and numbers: what actually happened.",
  "resolved": "YYYY-MM" | null,          // when it resolved (became true or clearly false); null if pending/ungradeable
  "sources": [{"title": "...", "url": "https://..."}],  // 1–2, real URLs you actually saw; [] only if ungradeable
  "subject": "price" | "adoption" | "technology" | "regulation" | "projects" | "markets" | "security" | "other",
  "headline": "A punchy 4–9 word label, e.g. 'Ethereum moves to proof of stake'",
  "relayed": false                       // true if the speaker is only reporting someone else's forecast (e.g. "Bill Miller says $1M"), not making their own
}
```

Never invent a URL. If you could not verify, say so in `outcome` and use `confidence: "low"`. Reply with only the counts per verdict.
