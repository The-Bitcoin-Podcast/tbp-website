# Prediction scorecard pipeline

How `data/predictions/graded.json` was made (November 2026). Each step's agents ran on a Claude subscription as Claude Code subagents.

1. `candidates.py <tbp-next> <out.json>`: cut every pre-2025 TBP / HIO / AEP transcript down to the lines that sound like forecasts (needs `index.jsonl` from the fact-card miner beside it, to skip episodes already mined).
2. Mining (Haiku, 20 batches): `MINING_BRIEF.md`. Output: one JSON array per batch in `mined/`.
3. `merge.py <tbp-next>`: re-find every quote in its transcript (drops any that don't match), fold in the prediction cards from `data/factcards`, dedupe re-released episodes, assign ids.
4. Grading (Sonnet with web search, 16 batches): `GRADING_BRIEF.md`, output in `graded/`.
5. Verification (Sonnet, 8 calls per agent) of every unsourced or low-confidence grade: `VERIFY_BRIEF.md`, output in `verified/`.
6. `assemble.py <out graded.json>`: merge grades, drop anything still unverified, any graded call without a live source (dead links from a URL check removed), and apply rewritten headlines.
7. `node scripts/predictions/build.mjs`: join episode metadata, apply `data/predictions/exclude.json`, write `src/data/predictions.json`.

To fix a single grade, edit `data/predictions/graded.json` and re-run step 7.
