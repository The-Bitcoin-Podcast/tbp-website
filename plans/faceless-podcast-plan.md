# Faceless Podcast Plan — "Then / Now" (working title)

*Drafted 2026-11-16. A low-cost, research-heavy crypto show for YouTube and Spotify, 18–22 minutes per episode, built from The Bitcoin Podcast archive.*

---

## 1. Why this works: we already have the hard part

| Asset in this repo | Size |
|---|---|
| Episode pages (`content/episodes/`) | ~1,200 across 24 shows (TBP 431, HIO 172, Just the Headers 80, …) |
| Whisper transcripts with timestamps (`tbp-next/data/transcripts/`) | **569 episodes, ~6.5M words, ~680 hours** |
| Original audio URLs (in each transcript JSON) | Yes, so real archive clips can be cut at exact timestamps |

Most faceless crypto channels rewrite the same news with AI. We can do something they can't: **use ten years of recorded predictions, debates and interviews, then test them against what actually happened.** That gives us original material, which matters for YouTube monetization (see §7). It also brings the TBP back catalog back into circulation.

**Format: "Then / Now."** Each episode takes one theme. We play what the TBP or HIO hosts and guests said at the time (real archive clips), then show where the data stands today and explain how it works. A synthetic narrator connects the pieces, so no one has to be on camera.

---

## 2. Episode blueprint (target 20:00, about 3,000 spoken words at 150 wpm)

| Time | Segment | Content |
|---|---|---|
| 0:00–0:40 | **Cold open** | A 15–30s archive clip with a strong claim or prediction, then the hook question |
| 0:40–2:00 | **The Brief** | Thesis plus 3 headline numbers on screen |
| 2:00–6:30 | **Then** | What was believed in year X: 2–3 short archive clips, with context on price, hashrate and the main players at the time |
| 6:30–12:30 | **Now** | Current data, 8–12 dated and sourced facts, and charts |
| 12:30–17:00 | **Mechanism** | How it actually works (protocol, economics, attack surface). This is the part enthusiasts come for |
| 17:00–19:30 | **Signal vs. Noise** | 5 rapid facts or myth-busts, with a scorecard on whether the archive call aged well |
| 19:30–20:30 | **Close** | One takeaway, a teaser for the next episode, and a pointer to sources in the show notes |

**Density rule:** at least 1 verifiable fact every 30 seconds (about 35–45 per episode), each with a date and a source in the show notes. No price predictions and no "not financial advice" filler beyond a single disclaimer line.

---

## 3. First 10 episodes (taken straight from the archive)

| # | Episode | Archive source(s) |
|---|---|---|
| 1 | **The DAO Hack, 10 Years On**: the fork, the funds, and what smart-contract security learned | `tbp68 Deconstructing TheDAO Attack`, HIO `DeFiSafety` |
| 2 | **Lightning: Promise vs. Capacity**: 2016 hopes compared with today's channel and capacity data | `tbp83 Lightning Network Deep Dive`, `#280 Lightning in a Box` |
| 3 | **The Block Size War**: from bike-shed to SegWit to today's fee market | `tbp88 Bitcoin Bike Shed`, `tbp126`, `tbp137 Countdown to SegWit` |
| 4 | **ICO Mania Post-Mortem**: what 2017 money became | `tbp133 ICO Woes`, `tbp166 ATMs and ICOs` |
| 5 | **MakerDAO to Sky: The Stablecoin Machine** | HIO `MakerDAO pt 1 & 2` |
| 6 | **Rollups Ate Ethereum**: optimistic vs. ZK, then and now | HIO `Optimistic Rollups – John Adler`, `Polygon zkEVM – Jordi Baylina` |
| 7 | **Privacy Coins Under Pressure** | `S02E08 Zcash`, `Monero Monitor – Mimblewimble`, HIO `Privacy Pools`, `Railgun` |
| 8 | **MEV: The Invisible Tax** | HIO `DAppNode MEV Smoothing`, plus current data |
| 9 | **Drivechains & Bitcoin L2s** | HIO `Paul Sztorc – Drivechains` |
| 10 | **Self-Custody Payments: BTCPay at Scale** | `#277 Nicolas Dorier BTCPay` |

### Episodes 11–20 (second mining round)

| # | Episode | Archive source(s) |
|---|---|---|
| 11 | **The Long Road to Proof of Stake**: Casper roadmaps vs. what shipped | HIO `Full Casper Chain v2`, `Casper+Sharding – Danny Ryan`, `#350 Paul Hauner (ETH2)` |
| 12 | **Mining: From Garages to Gigawatts** | `tbp138 21st Century 49ers`, `tbp144 Tomorrow's Electricity Today`, `tbp123 AsicBoost`, `#317 Core Scientific` |
| 13 | **Taproot: The Upgrade That Took Four Years** | `#325 Hocus Pocus Bitcoin Upgrade`, HIO `Blockstream – Andrew Poelstra` |
| 14 | **The Bitcoin Cash Split** | `tbp143 Damned If You Do`, `TBP #202 Roger Ver` |
| 15 | **Libra Died, Stablecoins Won** | `#263`, HIO `OpenLibra`, `#369 Will the Real Stable Coin…` |
| 16 | **Proof of Work vs. Proof of Stake: The Debate Revisited** | `#269 PoW vs PoS` |
| 17 | **NFTs: From CryptoArt to Ordinals** | HIO `SuperRare`, `#278 Cheeze Wizards`, `S02E02 Ordinals` |
| 18 | **Sound Money, Graded**: The Bitcoin Standard's claims checked | `#218 Saifedean Ammous` |
| 19 | **Halvings and Bubbles** | `#257`, `#308`, `#392 Bubble Season` |
| 20 | **Hacks, Bridges and China** | `#363 Poly Network`, `#272 Jack Got Hacked`, `#370`, `#383 Executive Order`, `tbp72 Broader Economy` |

After episode 20, rank further topics by archive depth multiplied by current search interest (free check: YouTube search suggestions and Google Trends).

---

## 4. Production pipeline (about 1.5 hours of human time per episode)

```
1. MINE        Archive → structured "fact cards" (once, batch)
2. PICK        Choose theme → pull matching cards + clip timestamps
3. NOW-DATA    Pull current numbers from free APIs
4. SCRIPT      Claude drafts 3,000-word script with [CLIP] and [CHART] markers
5. FACT-CHECK  Second pass: every claim → source URL, or cut it   ← human signs off
6. VOICE       TTS narrator renders script
7. ASSEMBLE    ffmpeg: narration + archive clips + music bed → audio master (-16 LUFS)
8. VIDEO       Programmatic render: waveform, captions, charts, clip lower-thirds
9. PUBLISH     Spotify for Creators (audio + video), YouTube, and a page on the TBP site
```

**Step details**

1. **Mine (one-time).** Run every transcript through Claude Haiku 5.5 using the Batch API. For each transcript it outputs JSON fact cards: `{claim, speaker, timestamp, year, topic tags, prediction?: true}`. This turns 6.5M words into a searchable research database, and it is reusable for every future episode, social clips, and the website.
2. **Pick.** Filter the cards by tag and pick 3–5 clips (15–45s each, about 2–3 minutes in total per episode).
3. **Now-data (free sources):** mempool.space API (fees, hashrate), DefiLlama (TVL, stablecoins, L2s), CoinGecko free tier (price and market cap), 1ML / Amboss (Lightning), L2BEAT (rollups), Dune free tier, FRED (macro).
4. **Script.** Claude Opus 5.5, given the fact cards, the data pull, and a house style guide (written once).
5. **Fact-check.** A separate Claude pass with web search tags each claim as verified, stale or unsupported. **You review the flags; this is the main quality gate.**
6. **Voice.** See the options in §5. Use one consistent narrator voice. **Do not clone any host's or guest's voice.**
7. **Assemble.** A shell script around ffmpeg (I can write this): it splices clips at the transcript timestamps, applies ducking and loudness normalization, and adds intro and outro stings.
8. **Video.** The YouTube version is audio plus generated visuals: animated captions, data charts at the `[CHART]` markers, archive clips with the speaker's name and year, and the TBP branding. It renders in code, so there is no editor subscription.
9. **Publish.** Also create an episode page in `content/episodes/<new-folder>/` so the existing site and sync scripts pick it up.

---

## 5. Pricing

### LLM costs (current Anthropic API list prices; Batch API is 50% off)

| Model | Input / Output per 1M tokens |
|---|---|
| Haiku 5.5 | $0.10 / $0.50 |
| Sonnet 5.5 | $2 / $10 |
| Opus 5.5 | $4 / $20 |

| Task | Estimate |
|---|---|
| **Mine the whole archive** (~8.7M input tokens, ~0.9M output, Haiku 5.5 batch) | **≈ $1 one-time** (≈ $13 if Sonnet 5.5 is needed for quality) |
| Script draft (Opus 5.5, ~40K in, ~15K out incl. thinking) | ≈ $0.45 / episode |
| Fact-check pass with web search (~20–40 searches) | ≈ $0.30–0.60 / episode |
| **LLM total per episode** | **≈ $1** |

Alternative: run the mining and scripting inside Claude Code on your existing subscription, which adds no API spend.

### Voice (the largest variable cost; check current prices at signup)

| Option | Cost per 20-min episode (~18K characters) | Quality |
|---|---|---|
| **Kokoro / F5-TTS run locally on your Mac** | **$0** | Good; needs some tuning |
| OpenAI / Google Cloud TTS (pay-as-you-go) | ~$0.30–0.60 | Good |
| ElevenLabs Creator plan (~$22/mo) | Covers ~5 eps/mo on the top model, ~10 on Flash | Best |

### Everything else: $0

Spotify for Creators hosting (also feeds Apple and others via RSS), YouTube, ffmpeg, Audacity or DaVinci Resolve (free), YouTube Audio Library music, thumbnails in Canva free or generated in code, and data from free APIs.

### Monthly totals at 4 episodes per month

| Tier | Setup | Monthly | Notes |
|---|---|---|---|
| **Lean (recommended start)** | ~$1 | **~$4–5** | Local TTS, API for scripts |
| Standard | ~$1 | **~$26–30** | ElevenLabs Creator voice |
| Weekly + Shorts | ~$1 | ~$30–35 | Plus 3–5 Shorts per episode cut from the same assets |

**Upgrade rule:** start Lean. Move to ElevenLabs only if the first 4 episodes show retention problems in the first 60 seconds of YouTube's audience-retention graph.

---

## 6. Launch timeline

| Week | Deliverable |
|---|---|
| 1 | Run the archive-mining batch, write the style guide, pick a name, set up the voice, design the brand template |
| 2 | Pipeline scripts (clip cutter, ffmpeg assembly, video render). Produce **Episode 1** end to end |
| 3 | Produce Episodes 2–3 and release all three together on launch day (a back catalog keeps new viewers watching) |
| 4+ | Weekly cadence plus 3 Shorts per episode. Review retention and CTR after episode 6 |

---

## 7. Risks and guardrails

- **YouTube "inauthentic / mass-produced content" policy.** Channels that only post AI voice-over get demonetized. Our defenses are real archive audio, original data analysis, a human editorial pass, and a consistent named format. Never upload unreviewed AI output.
- **AI disclosure.** Tick YouTube's "altered or synthetic content" box where it applies, and state in the show notes that the narration is synthetic.
- **Archive rights.** TBP owns its recordings, but guest appearances were given for the original show. Keep clips short and in context, credit the speaker by name and episode, and link back to the full episode. Remove a clip if a guest objects.
- **Accuracy.** Every number carries a date, every claim has a source, and the show never gives investment advice. An error costs more credibility than skipping a fact.
- **Name or brand.** Decide whether this runs under the TBP brand (built-in audience, feed and site) or as a new show (a clean start, but subscribers from zero). **Recommendation:** a new show titled "from The Bitcoin Podcast archive", with a separate feed that is cross-promoted from the TBP feed.

---

## 8. Open decisions for us

1. Name: *Then/Now*, *Block Height*, *The Ledger Archive*, or something else
2. Under the TBP brand or a separate brand (see §7)
3. Lean (local TTS) or Standard (ElevenLabs) to start
4. Cadence: weekly or biweekly
