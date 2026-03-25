---
title: "Bitcoin Post-Quantum: Primary Sources & Further Reading"
date: 2026-03-25
tags:
  - bitcoin
  - cryptography
  - post-quantum
  - sources
  - references
description: "All primary sources, papers, proposals, and commentary referenced in the Bitcoin Post-Quantum Research Report — organized by category with annotations."
---

> [!info] How to Use This Document
> This is the companion source document to [[bitcoin-post-quantum|Bitcoin's Race to Quantum Resistance]]. Sources are organized by topic. Each section corresponds to a section of the main report. Use the table of contents to navigate.

---

## Table of Contents

1. [[#formal-proposals|Formal Proposals (BIPs and BIP-Adjacent)]]
2. [[#nist-standards|NIST Post-Quantum Cryptography Standards]]
3. [[#algorithm-references|Algorithm Technical References]]
4. [[#chaincode-labs-report|Chaincode Labs: Bitcoin and Quantum Computing Report]]
5. [[#threat-model|Threat Model: Quantum Timeline and Vulnerability Analysis]]
6. [[#project-eleven|Project Eleven: Q-Day Prize and Research]]
7. [[#satoshi-coins|The Satoshi Coin Debate]]
8. [[#lopp-essay|Jameson Lopp: Against Quantum Recovery]]
9. [[#qramp|QRAMP: Mandatory Migration Proposal]]
10. [[#coinshares-report|CoinShares: Quantum Risk Assessment]]
11. [[#developer-mailing-list|Bitcoin Developer Mailing List Threads]]
12. [[#market-and-ecosystem|Market Response and Ecosystem Coverage]]
13. [[#implementation|Implementation and Tooling]]

---

## Formal Proposals (BIPs and BIP-Adjacent) {#formal-proposals}

### BIP-360: Pay-to-Merkle-Root (P2MR) — Official

> **The proposal itself, merged into the official Bitcoin BIP repository on February 11, 2026.**

- **Official BIPs repo (current):** https://github.com/bitcoin/bips/blob/master/bip-0360.mediawiki
- **Dedicated site:** https://bip360.org — Includes rendered BIP, changelog, and additional context
- **Rendered HTML version:** https://bip360.org/bip360.html

**Context:** Originally titled "Pay-to-Quantum-Resistant-Hash" (P2QRH), the proposal was first posted to Delving Bitcoin by Hunter Beast on June 8, 2024. It underwent 11 major versions before stabilization. The critical pivot in v0.8.0 (July 2025) stripped all PQ signature algorithms out of the output type itself — deferring them to a future companion BIP — and introduced Ethan Heilman as co-author. Isabel Foxen Duke joined as third author.

### BIP-360: Historical Branch (P2QRH — Pre-Rename)

- **Hunter Beast's working branch:** https://github.com/cryptoquick/bips/blob/p2qrh/bip-0360.mediawiki
- **Snapshot with original P2QRH framing:** https://github.com/cryptoquick/bips/blob/0ae69db70a4a28f202d441b7131cd5b2169e7afe/bip-0360.mediawiki

**Note:** The pre-rename versions are useful for understanding how and why the proposal evolved. The v0.6.0 snapshot still includes SQIsign and FALCON before they were dropped.

### BIP-Hourglass V2: Rate-Limiting P2PK Spends

- **Hunter Beast's Hourglass V2 draft:** https://github.com/cryptoquick/bips/blob/hourglass-v2/bip-hourglass-v2.mediawiki

**What it proposes:** Rate-limit spends from P2PK outputs to 1 output per block (~144 BTC/day). At that pace, the ~1.72M BTC P2PK pool would take 32+ years to drain — preventing a catastrophic supply shock if quantum computers arrive while large vulnerable holdings remain. This is intended as a soft, temporary measure, not a permanent freeze.

### Lopp-Papathanasiou: Post-Quantum Migration Proposal

- **Draft BIP (Jameson Lopp's repo):** https://github.com/jlopp/bips/blob/quantum_migration/bip-post-quantum-migration.mediawiki
- **Companion site:** https://qbip.org — *Post Quantum Migration and Legacy Signature Sunset*

**Three-phase structure:**
1. **Phase A** (3 years post-BIP-360): Ban sending to vulnerable address types
2. **Phase B** (5 years post-BIP-360): All legacy ECDSA/Schnorr spends become invalid
3. **Phase C** (Optional): ZK proof-of-seed recovery mechanism

**Limitation:** Phase C recovery is only compatible with BIP-39 seed phrases, which postdate Satoshi-era P2PK outputs. Satoshi's coins and other pre-2013 holdings could not use this mechanism.

### QRAMP: Quantum-Resistant Address Migration Protocol {#qramp}

- **Bitcoindev mailing list proposal:** https://groups.google.com/g/bitcoindev/c/8PM6iZCeDMc
- **Coverage:** https://bitcoinnews.com/adoption/dormant-coins-qramp-quantum-resistant-fork/

**Authored by:** Agustin Cruz

**What it proposes:** A mandatory hard deadline after which all legacy ECDSA/Schnorr spends become permanently invalid. The hardest-line proposal in the debate — requires a hard fork or extremely aggressive soft fork and broad consensus that has not materialized. Covered extensively in discussions about its potential to cause a chain split.

---

## NIST Post-Quantum Cryptography Standards {#nist-standards}

### The Three Finalized Standards (August 2024)

- **NIST announcement:** https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards
- **CSRC formal approval notice:** https://csrc.nist.gov/news/2024/postquantum-cryptography-fips-approved

**The three standards finalized August 13, 2024:**

| Standard | Scheme | Basis | Bitcoin Relevance |
|---|---|---|---|
| FIPS 203 | ML-KEM (Kyber) | Lattice | Key encapsulation only, not relevant for signing |
| FIPS 204 | ML-DSA (Dilithium) | MLWE Lattice | **Primary signing candidate for Bitcoin** |
| FIPS 205 | SLH-DSA (SPHINCS+) | Hash functions | **Conservative signing alternative** |

A fourth standard, FIPS 206 (FN-DSA / FALCON), followed after initial publication.

### In-Depth Technical Analysis: Cloudflare

- **Cloudflare blog post on NIST's first PQ standards:** https://blog.cloudflare.com/nists-first-post-quantum-standards/

Well-written technical overview of ML-KEM, ML-DSA, and SLH-DSA with concrete implementation guidance. Cloudflare was among the earliest large-scale deployers of post-quantum cryptography in TLS.

### Overview: PostQuantum.com

- **Technical overview of Kyber, Dilithium, SPHINCS+:** https://postquantum.com/post-quantum/nists-pqc-technical/

---

## Algorithm Technical References {#algorithm-references}

### ML-DSA (CRYSTALS-Dilithium) Implementation Details

- **A Security Site — Dilithium Signature:** https://asecuritysite.com/pqc/dilithium_sign

Covers key sizes (ML-DSA-44: 1,312B public key, 2,420B signature), parameter sets, and comparative analysis against FALCON and SPHINCS+.

### SLH-DSA (SPHINCS+) — Hash-Based Cryptography

- **Wikipedia: Hash-based cryptography:** https://en.wikipedia.org/wiki/Hash-based_cryptography

Good conceptual overview of why hash-based signatures are considered the most conservative post-quantum option. Security reduces to hash function collision resistance — the same assumption Bitcoin already makes for proof-of-work.

### FN-DSA (FALCON) — What Made It Attractive and Why It Was Dropped

- **Algorand's technical brief on FALCON signatures:** https://algorand.co/blog/technical-brief-quantum-resistant-transactions-on-algorand-with-falcon-signatures

Algorand has deployed FALCON in production. This brief explains the technical advantages (compact signatures, potential for aggregation) and the implementation challenges (constant-time floating-point arithmetic, side-channel risks). Provides comparison of FALCON-512 vs FALCON-1024 parameter sets.

### Signature Size Visualization Tool

- **PQ Signature Size Explorer:** https://pqcvisualizer.com/

Interactive tool for comparing signature and public key sizes across all major post-quantum schemes. Useful for developing intuition about the scale of the size problem.

### Hash-Based Signatures for Bitcoin — Developer Discussion

- **Bitcoindev mailing list:** https://groups.google.com/g/bitcoindev/c/gOfL5ag_bDU/m/0YuwSQ29CgAJ

**"Hash-Based Signatures for Bitcoin's Post-Quantum Future"** — an early and influential thread arguing for prioritizing SLH-DSA (hash-based) over lattice schemes for Bitcoin. Captures the core argument: Bitcoin should minimize novel cryptographic assumptions and anchor to the same primitives it already trusts.

### Hybrid Post-Quantum Signatures Research

- **Preprints.org:** https://www.preprints.org/manuscript/202509.2079

**"Hybrid Post-Quantum Signatures for Bitcoin and Ethereum: A Protocol-Level Integration Strategy"** — academic paper examining the tradeoffs of requiring both classical and PQ signatures during a transition period. Covers overhead analysis and activation sequence design.

---

## Chaincode Labs: Bitcoin and Quantum Computing Report {#chaincode-labs-report}

- **Full PDF report:** https://chaincode.com/bitcoin-post-quantum.pdf
- **Title:** *Bitcoin and Quantum Computing: Current Status and Future Directions*
- **Published:** May 2025

**This is the most technically comprehensive public document on the topic.** Chaincode Labs is one of Bitcoin's most respected research organizations (home to developers including Pieter Wuille's former work, Suhas Daftuar, etc.). The report covers:

- Detailed quantum hardware timeline analysis (IBM, Google, IonQ roadmaps)
- Qubit requirements for breaking secp256k1 (citing Dallaire-Demers et al.)
- Comprehensive algorithm comparison with concrete size tables
- The dual-track framework (2-year contingency vs 7-year comprehensive)
- Lifeboat scheme designs (commit-delay-reveal)
- Fee and UTXO set impact modeling
- Ecosystem coordination requirements

**The report's key framing:** Bitcoin faces two distinct threats — "long-exposure attacks" on already-exposed public keys (P2PK), and "short-exposure attacks" on public keys revealed during spending. Each requires different countermeasures.

---

## Threat Model: Quantum Timeline and Vulnerability Analysis {#threat-model}

### Quantum Vulnerability of Bitcoin Addresses

- **Project Eleven blog post:** https://blog.projecteleven.com/posts/quantum-vulnerability-of-bitcoin-addresses

Detailed breakdown of how many BTC are in which address types, with vulnerability classification. Concludes ~6–7 million BTC have exposed public keys at varying levels of risk.

### Technical Reality Check on Timelines

- **Simple Mining:** https://www.simplemining.io/insights/post/can-quantum-computing-break-bitcoin

Good overview-level piece: walks through the qubit requirements, current hardware vs. requirements gap, and why 2030–2035 is the credible concern window rather than the present.

### Quantum Risks to Cryptocurrencies

- **PostQuantum.com overview:** https://postquantum.com/post-quantum/quantum-cryptocurrencies-bitcoin/

Covers Bitcoin, Ethereum, and other blockchain systems. Provides comparative context: Ethereum is in some ways more exposed (more P2PK-equivalent usage patterns) and less organizationally prepared.

### Grover's Algorithm and SHA-256 Mining

- The threat to SHA-256 is covered in the Chaincode report and Simple Mining piece above. The key conclusion: **Grover provides only quadratic speedup, and a quantum miner with optimistic specs would achieve ~13.8 GH/s vs. modern ASICs running at hundreds of TH/s** — over 1,000× slower. SHA-256 mining is effectively quantum-safe at current scales.

### Post-Quantum Blockchain Readiness (Broader Context)

- **Sidereus Hu — Post-Quantum Readiness in Blockchain:** https://sidereushu.com/posts/post-quantum-readiness-in-blockchain---threats-roadmaps-and-migration-strategy-ii/

Covers multiple blockchain ecosystems. Bitcoin section covers the same ground as primary sources; the broader context is useful for understanding where Bitcoin sits relative to other chains.

---

## Project Eleven: Q-Day Prize and Research {#project-eleven}

- **Q-Day Prize announcement — Bitcoin Magazine:** https://bitcoinmagazine.com/news/project-eleven-to-award-1-btc-to-tackle-bitcoins-quantum-vulnerability
- **Project Eleven raises $6M — CoinDesk (June 2025):** https://www.coindesk.com/tech/2025/06/19/project-eleven-raises-6m-to-defend-bitcoin-from-the-coming-quantum-threat
- **Project Eleven raises $6M — Blockchain News:** https://blockchain.news/flashnews/project-eleven-raises-6m-to-defend-bitcoin-btc-from-imminent-q-day-quantum-computing-threat
- **Survey of post-quantum proposals for Bitcoin:** https://blog.projecteleven.com/posts/a-look-at-post-quantum-proposals-for-bitcoin

**Background:** Project Eleven is a quantum computing research organization focused on Bitcoin's vulnerability. They launched the **Q-Day Prize** in April 2025: a 1 BTC bounty for breaking the largest ECC key using Shor's algorithm on actual quantum hardware, with a deadline of April 5, 2026. The prize is designed to benchmark real quantum hardware capability — not to threaten Bitcoin, but to establish a concrete empirical datapoint on the current gap between threat and reality.

Their $6M funding round in June 2025 was notable for a research org in this niche, signaling institutional interest in the question.

---

## The Satoshi Coin Debate {#satoshi-coins}

### The Numbers: How Much Is at Stake

- **CoinDesk — "To Freeze or Not to Freeze" (February 2026):** https://www.coindesk.com/business/2026/02/22/to-freeze-or-not-to-freeze-satoshi-and-the-usd440-billion-in-bitcoin-threatened-by-quantum-computing

The headline figure: ~7 million BTC (~$440 billion at time of writing) threatened, including Satoshi's ~1 million BTC. In-depth treatment of the freeze debate and community positions.

- **CoinDesk — Devs float proposal to freeze vulnerable addresses (July 2025):** https://www.coindesk.com/tech/2025/07/16/bitcoin-devs-float-proposal-to-freeze-quantum-vulnerable-addresses-even-satoshi-nakamoto-s

Coverage of the Lopp-Papathanasiou proposal's public release. Includes reactions from across the developer spectrum.

- **Checkonchain — "One Day, Satoshi's Coins Will Move":** https://newsletter.checkonchain.com/p/one-day-satoshis-coins-will-move

On-chain analysis of Satoshi-era outputs, their address types, and what quantum recovery might mean for price and supply dynamics.

### Hard Fork Risk

- **Cointelegraph Magazine:** https://cointelegraph-magazine.com/bitcoin-may-face-hard-fork-over-any-attempt-to-freeze-satoshis-coins/

The most direct treatment of the chain split scenario. Surveys developer positions and community sentiment. The article's core finding: there is no freeze proposal with sufficient consensus to avoid a fork if forced through.

### Burning Coins to Prevent Quantum Theft

- **Crypto Times (April 2025):** https://www.cryptotimes.io/2025/04/05/bitcoin-dev-proposes-burning-old-coins-to-counter-quantum-attack/

Coverage of the most aggressive proposal — destroying vulnerable coins rather than freezing or rate-limiting them. Represents one end of the option space.

---

## Jameson Lopp: Against Quantum Recovery {#lopp-essay}

- **Primary essay:** https://blog.lopp.net/against-quantum-recovery-of-bitcoin/

**Published:** March 2025. This is the definitive statement of the "freeze/burn" position by one of Bitcoin's most prominent technical commentators. Key arguments:

1. Quantum recovery is not "found money" — it is theft at scale, transferring wealth from all holders to quantum-capable actors
2. Nation-states and FAANG-scale companies will be first to achieve CRQC capability; allowing quantum recovery means transferring ~$440B to the most powerful entities in the world
3. The immutability argument works both ways: Bitcoin's social contract has always included that cryptographically broken coins can be handled by network consensus
4. The "harvest now, decrypt later" threat is already operating — every day of inaction increases the stored attack surface

**Worth reading in full.** The essay is unusually precise about the practical mechanics of what quantum recovery would look like at the supply level.

---

## CoinShares: Quantum Risk Assessment {#coinshares-report}

- **CoinShares report:** https://coinshares.com/insights/research-data/quantum-vulnerability-in-bitcoin-a-manageable-risk/
- **Title:** *Quantum Vulnerability in Bitcoin: A Manageable Risk*

**CoinShares is one of the largest digital asset management firms in Europe.** Their report takes a deliberately measured tone against what they characterize as "quantum hysteria" — arguing that:

- The hardware gap remains enormous and the timeline is genuinely uncertain
- Bitcoin's developer community has demonstrated the ability to coordinate complex protocol changes
- Premature action carries its own risks (introducing bugs, fragmenting the ecosystem)
- The risk is "manageable" given appropriate preparation time

This represents the institutional "calm down, but plan carefully" position, in contrast to the more urgent framing from Project Eleven and Lopp.

---

## Bitcoin Developer Mailing List Threads {#developer-mailing-list}

All threads are on the Bitcoindev Google Group.

### BIP-360 Status Updates

- **"Changes to BIP-360 - Pay to Quantum Resistant Hash (P2QRH)"** — tracks the major architectural pivot in v0.8.0: https://groups.google.com/g/bitcoindev/c/nSAd0UmDSvc

- **"P2QRH / BIP-360 Update"** — general status thread, multiple messages: https://groups.google.com/g/bitcoindev/c/oQKezDOc4us

- **Mail Archive mirror of the P2QRH update thread:** https://www.mail-archive.com/bitcoindev@googlegroups.com/msg00150.html

### QRAMP Discussion

- **"Proposal for Quantum-Resistant Address Migration Protocol (QRAMP) BIP":** https://groups.google.com/g/bitcoindev/c/8PM6iZCeDMc

**Note on using these threads:** Bitcoin's developer mailing list is the primary venue for technical BIP discussion. Positions expressed here carry more weight than media coverage. Pieter Wuille's blunt statement about confiscation and other technical consensus signals appear in these threads before appearing in press coverage.

---

## Market Response and Ecosystem Coverage {#market-and-ecosystem}

### BIP-360 Merged to Official Repository

- **Cryptopolitan:** https://www.cryptopolitan.com/quantum-resistance-bip-360-btc-repository/
- **BitcoinEthereumNews:** https://bitcoinethereumnews.com/bitcoin/quantum-attack-resistance-bip-360-added-into-the-official-bitcoin-repository/
- **Bitcoin Magazine — "Bitcoin Advances Toward Quantum Resistance With BIP 360":** https://bitcoinmagazine.com/news/bitcoin-advances-toward-quantum-resistance

Coverage of the February 11, 2026 merge. Note: several outlets overstated the significance — merge into the BIPs repo is a documentation milestone, not a protocol activation.

### BIP-360 Explained for General Audiences

- **The Bitcoin Manual:** https://thebitcoinmanual.com/articles/bip-360/
- **KuCoin — "BIP-360 Explained: Bitcoin's First Step Toward Quantum Resistance":** https://www.kucoin.com/news/flash/bip-360-explained-bitcoin-s-first-step-toward-quantum-resistance
- **Crypto News — "Bitcoin's Draft BIP 360 Introduces P2MR":** https://cryptonews.net/news/bitcoin/32422811/

### Taproot Adoption Decline

The drop in Taproot usage (from 54% to 22% of market share by early 2026) is tracked by on-chain analytics platforms. The connection to quantum concerns is noted in AMBCrypto's coverage:

- **AMBCrypto — "Bitcoin's post-quantum plan BIP-360 gains traction":** https://ambcrypto.com/bitcoins-post-quantum-plan-bip-360-gains-traction-but-will-it-reverse-market-sell-off/

### Quantum Bitcoin Summit

- **Presidio Bitcoin Substack — Insights from the Quantum Bitcoin Summit:** https://presidiobitcoin.substack.com/p/insights-from-the-quantum-bitcoin
- **Bitcoin Magazine — A Grounded Look At The Issues:** https://bitcoinmagazine.com/technical/the-quantum-bitcoin-summit-a-grounded-look-at-the-issues

The Summit (2025) brought together developers, researchers, and institutional participants. The dual-track framework (2-year contingency, 7-year comprehensive) emerged from this event as the primary organizational schema for the migration effort.

### How to Protect Your Bitcoin Now

- **Yellow.com — Practical guidance:** https://yellow.com/learn/protect-bitcoin-quantum-threats-now

Covers the practical steps available to ordinary users today: move to fresh P2WPKH addresses (avoid address reuse), monitor BIP-360 status, avoid Taproot key-path spends until P2MR activation. Not a substitute for the technical reading but useful for the "what should I actually do" question.

### Bitcoin's Proposed Quantum-Resistant Migration Plan

- **Quantum Foundry Substack:** https://quantumfoundry.substack.com/p/bitcoins-proposed-quantum-resistant

Good overview synthesis of the multiple proposals (BIP-360, QRAMP, Hourglass, Lopp-Papathanasiou) with comparative analysis of tradeoffs.

### New Bitcoin Improvement Proposal — Bitcoin Magazine

- **Bitcoin Magazine (original BIP-360 coverage):** https://bitcoinmagazine.com/news/new-bitcoin-improvement-proposal-aims-to-solve-future-quantum-security-risks

Early coverage from when the proposal was first introduced in mid-2024. Useful for historical context on how the conversation started.

---

## Implementation and Tooling {#implementation}

### libbitcoinpqc — Reference Implementation

- **GitHub:** https://github.com/cryptoquick/libbitcoinpqc

**Title:** *Post-Quantum Cryptography for use with Bitcoin according to BIP-360*  
**Maintained by:** Hunter Beast (cryptoquick)

This is the reference library accompanying BIP-360. Currently implements ML-DSA-44 (CRYSTALS-Dilithium) with the signing interface designed for Bitcoin's witness structure. This is where future `OP_CHECKMLSIG` development will be prototyped.

**Status:** Functional but not production-ready. Serves as proof-of-concept for the companion BIP's algorithm selection.

### Signet Testing

The first P2MR transaction was executed on Bitcoin's **signet testnet on September 10, 2025**. Signet is a controlled test network that allows proposal authors to demonstrate functionality without mainnet risk. Testnet and signet work typically precedes activation proposals by months to years.

---

*← Back to the main report: [[bitcoin-post-quantum|Bitcoin's Race to Quantum Resistance]]*
