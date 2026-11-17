# Verification brief (second pass)

A first-pass grader graded these on-air crypto forecasts (made 2015–2024) but ran out of search budget, so each grade below is unsourced or low confidence. **Today is 2026-11-17.** These go on the show's public scorecard, so every grade must be backed by a source you actually saw.

The input file holds 8 or fewer items. Each has the original `quote`, `claim`, `date`, `horizon`, and the first-pass `verdict`, `outcome` and `sources`.

For each item:
1. Run at least one targeted WebSearch (WebFetch a page if the search snippet is not enough). Budget about 2 searches per item.
2. Decide the verdict yourself: `hit` (happened as said, on time if a deadline was given), `partial` (direction right, size/timing/detail off), `miss` (didn't happen, deadline passed, or opposite happened), `pending` (deadline not reached / still open), `ungradeable` (too vague, a joke, not a forecast). Judge the quote over the paraphrase. Change the first-pass verdict if the evidence says so.
3. Write a specific `outcome` (1–2 sentences, with dates/numbers) and 1–2 `sources` with URLs you actually saw in results or fetched. Never invent or "tidy" a URL.
4. If after searching you still cannot confirm what happened, set `"unverified": true`.

Write ONE JSON array to the output path you were given, one object per input item, same order:

```json
{"id": "...", "verdict": "...", "confidence": "high|medium|low", "outcome": "...", "resolved": "YYYY-MM"|null,
 "sources": [{"title": "...", "url": "https://..."}], "unverified": false}
```

Reply with only the counts per verdict and the number left unverified.
