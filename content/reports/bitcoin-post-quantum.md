---
title: "Bitcoin's Race to Quantum Resistance: BIP-360 and the Post-Quantum Fork Ahead"
date: 2026-03-25
tags:
  - bitcoin
  - cryptography
  - post-quantum
  - BIP-360
  - research
description: "A comprehensive technical and political analysis of Bitcoin's post-quantum cryptography transition — the proposals, the algorithms, the threat model, and the explosive question of what happens to Satoshi's coins."
---

> [!note] About This Report
> This report was produced in March 2026 and reflects the state of Bitcoin's post-quantum efforts as of BIP-360 v0.11.0. The field is moving fast. For primary sources, see [[bitcoin-post-quantum-sources|the companion source document]].

---

## Overview

On February 11, 2026, BIP-360 — Bitcoin's first formal proposal to defend against quantum computers — was merged into the official Bitcoin BIPs repository. It was a milestone, but an incremental one. The merge signals that the proposal meets documentation standards for formal discussion, not that activation is imminent or endorsed.

The stakes are real: roughly **6–7 million BTC** (25–33% of circulating supply) sit in addresses whose public keys are exposed on-chain. A sufficiently powerful quantum computer running Shor's algorithm could derive private keys from those public keys and drain those coins. No such machine exists today. But hardware roadmaps, government mandates, and the "harvest now, decrypt later" threat model mean the window for orderly migration is finite — and closing.

This report maps the full terrain: the technical proposals, the cryptographic choices, the economic consequences, and the political fault lines that will determine whether Bitcoin's quantum transition goes smoothly or forces the most contentious fork in the protocol's history.

---

## 1. The Threat Model: What Quantum Computers Actually Break

### Shor's Algorithm and secp256k1

Bitcoin's security rests on the Elliptic Curve Discrete Logarithm Problem (ECDLP) over secp256k1. Given a public key $Q = k \cdot G$, finding the private key $k$ is computationally infeasible classically — requiring ~$2^{128}$ operations, or more time than the age of the universe on any classical hardware.

Shor's algorithm, published in 1994, changes this. Running on a quantum computer with sufficient logical qubits, it solves the ECDLP in polynomial time — hours to days, not eons. The practical requirement to break secp256k1: an estimated **2,330–2,619 logical qubits**, which translates to **100,000–1,000,000 physical qubits** after quantum error correction overhead.[^chaincode]

[^chaincode]: Dallaire-Demers et al. (2025), cited in Chaincode Labs' comprehensive report. See [[bitcoin-post-quantum-sources#chaincode-labs-report|Chaincode source]].

Current state of the art: **Google's Willow chip has 105 physical qubits.** IBM's roadmap projects 200 logical qubits by 2029 (Starling) and 2,000 by 2033 (Blue Jay). IonQ claims targets of 8,000 logical qubits by 2029, though with significant skepticism attached.

One third of surveyed cryptography experts place a **50%+ probability** on cryptographically relevant quantum computers (CRQCs) arriving between 2030 and 2035. The U.S. government has drawn its own lines: NIST directives call for deprecating vulnerable ECC algorithms by **2030** and disallowing them entirely by **2035**. The NSA's CNSA 2.0 framework requires quantum-safe systems by 2030.

### Which Bitcoin Outputs Are Vulnerable — and How Exposed

The threat is not uniform. Address type determines exposure:

| Output Type | Exposure | Attack Window |
|---|---|---|
| **P2PK** | Public key on-chain permanently | Unlimited (long-exposure attack) |
| **P2PKH (reused address)** | Public key revealed on first spend | Unlimited after reuse |
| **P2PKH (fresh address)** | Key hidden until spend | ~10–60 min mempool window |
| **P2WPKH / P2TR (fresh)** | Key hidden until spend | ~10–60 min mempool window |
| **P2TR (key path)** | Internal key on-chain | Unlimited |

Current estimates suggest Shor's algorithm would need a **minimum of ~8 hours per key** even on a near-future CRQC. This provides meaningful buffer against mempool front-running for fresh addresses — but zero buffer for long-exposure P2PK outputs.

### What Quantum Computers Do *Not* Break

Grover's algorithm threatens SHA-256 (Bitcoin's proof-of-work hash), but only with a *quadratic* speedup. A quantum miner with optimistic specs would achieve ~13.8 GH/s — **over 1,000× slower** than a single modern ASIC. SHA-256 mining is effectively quantum-resistant at current scales. The real vulnerability is exclusively in the ECDSA/Schnorr signature schemes.

> [!warning] Harvest Now, Decrypt Later
> Adversaries can collect exposed public keys *today* — from the blockchain's permanent record — and wait for quantum capability. This threat has been acknowledged by the Federal Reserve and cited in BlackRock's Bitcoin ETF risk disclosure. Every P2PK output mined before 2009–2010 is a stored target.

---

## 2. BIP-360: From P2QRH to Pay-to-Merkle-Root

### The Proposal's Evolution

BIP-360 has been through eleven major versions since Hunter Beast first posted the concept on Delving Bitcoin on **June 8, 2024**. The evolution reveals how hard this problem is:

- **v0.1 (June 2024):** "Pay-to-Quantum-Resistant-Hash" (P2QRH) — a new output type bundling four PQ signature algorithms
- **v0.6.0 (January 2025):** Dropped SQIsign (15,000× slower verification than ECC)
- **v0.8.0 (July 2025):** Co-author Ethan Heilman joins; all PQ signatures stripped out entirely, deferred to a future companion BIP
- **v0.9.0 (September 2025):** Renamed P2TSH
- **v0.11.0 (February 2026):** Final rename to **Pay-to-Merkle-Root (P2MR)**; merged into official Bitcoin BIPs repository February 11, 2026

### What P2MR Actually Does

P2MR is elegant in its current form: it is **Taproot with the key-path spend removed.**

Taproot (P2TR) commits to both an internal public key and a Merkle root of scripts. This means the internal public key is always derivable from the on-chain commitment — creating a long-exposure vulnerability. P2MR commits *only* to the Merkle root:

```
scriptPubKey: OP_2 OP_PUSHBYTES_32 <merkle_root>
```

No public key ever appears on-chain until a script-path spend executes — and even then, only the specific leaf key used in that spend is revealed. This eliminates long-exposure attacks entirely using today's cryptography.

Additional structural changes from Taproot:
- **SegWit version 2**, producing **bc1z** addresses
- Control blocks are **32 bytes smaller** (no internal key field)
- All spends are script-path spends — no key-path shortcut

The first P2MR transaction was executed on Bitcoin's signet testnet on **September 10, 2025**.

### Why Separate the Output Type from the Signature Scheme?

This was the critical design insight. By decoupling P2MR from PQ signature selection:

1. **P2MR can be activated sooner** while algorithm debates continue
2. **Users can migrate immediately** using familiar Schnorr signatures inside P2MR script paths — gaining structural quantum resistance
3. **When a future BIP introduces opcodes like `OP_CHECKMLSIG`** via OP_SUCCESSx redefinition, those same P2MR outputs automatically gain full quantum resistance without additional migration
4. **Bug surface is minimized** — the output type change is simpler than bundling novel cryptographic primitives

The companion BIP for PQ signatures is expected to support **two algorithms: ML-DSA and SLH-DSA**, providing both a performant lattice-based option and a conservative hash-based fallback.

---

## 3. The Algorithm Landscape: Tradeoffs at Every Turn

> [!info] NIST Standardization Context
> In August 2024, NIST finalized its first three post-quantum cryptography standards: FIPS 203 (ML-KEM, for key encapsulation), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA). A fourth standard, FIPS 206 (FN-DSA/FALCON), followed. See [[bitcoin-post-quantum-sources#nist-standards|NIST sources]].

All size comparisons below are against Bitcoin's current **64-byte Schnorr signatures** and **32-byte compressed public keys**.

### ML-DSA (CRYSTALS-Dilithium, FIPS 204) — The Performant Lattice Option

**Security basis:** Module Learning With Errors (MLWE) — a lattice problem  
**Sizes at Level I (ML-DSA-44):**
- Public key: **1,312 bytes** (41× larger)
- Signature: **2,420 bytes** (38× larger)

**Pros:** Fast signing and verification; straightforward implementation; `libbitcoinpqc` already implements ML-DSA-44; a future `OP_CHECKMLSIG` opcode is planned.

**Cons:** UTXO set bloat is severe — one analysis estimates the set could expand **59× from ~5 GB to ~296 GB** if all outputs stored ML-DSA public keys. Lattice assumptions are newer and less battle-tested than hash functions.

### SLH-DSA (SPHINCS+, FIPS 205) — The Conservative Hash-Only Option

**Security basis:** Hash function hardness only — the same assumption Bitcoin already trusts for SHA-256 mining and address derivation  
**Sizes at Level I:**
- Public key: **32 bytes** (same as today)
- Signature: **7,856–17,088 bytes** (123–267× larger, depending on speed/size tradeoff)
- Optimized variants can reach **~3,100–4,000 bytes**

**Pros:** Security rests on the oldest and most trusted cryptographic assumption in Bitcoin. Matt Corallo, Adam Back, and others have argued strongly for a hash-based-only approach. Public keys are tiny.

**Cons:** Signatures are enormous. Even the smallest practical SLH-DSA signature is ~50× larger than Schnorr. This means roughly **40× fewer transactions per block** in the worst case.

### FN-DSA (FALCON, FIPS 206) — Dropped

**Security basis:** NTRU lattice  
**Sizes at FALCON-512:**
- Public key: **897 bytes**
- Signature: **~690 bytes** (11× larger)

**Why it was removed from BIP-360:** Complex implementation requiring constant-time floating-point arithmetic creates side-channel risks. Key generation is ~66× slower than Dilithium. Despite the best size numbers, the implementation safety concerns outweighed the benefits.

### SQIsign — Dropped Early

**Security basis:** Isogeny-based cryptography (supersingular elliptic curve isogenies)  
**Sizes:** Public key ~128 bytes; signature ~177 bytes — tantalizingly compact

**Why it was removed (v0.6.0):** Verification is approximately **15,000× slower than ECC**. A block filled with SQIsign transactions would take roughly four hours to validate — completely incompatible with Bitcoin's consensus requirements.

### Algorithm Comparison Table

| Algorithm | Standard | Pub Key | Signature | Verify Speed | Status in BIP-360 |
|---|---|---|---|---|---|
| Schnorr (current) | — | 32B | 64B | Fast | Baseline |
| ML-DSA-44 | FIPS 204 | 1,312B | 2,420B | Fast | Planned (future BIP) |
| SLH-DSA-128s | FIPS 205 | 32B | 7,856B | Moderate | Planned (future BIP) |
| FN-DSA-512 | FIPS 206 | 897B | 690B | Fast | Dropped |
| SQIsign | — | ~128B | ~177B | Very slow | Dropped |

---

## 4. Economic Consequences: The Size Problem

### Signatures Get 10–40× Bigger

The arithmetic is stark. Under Taproot, a standard key-path spend weighs **66 bytes** of witness data. Under P2MR + ML-DSA, the signature data alone is **2,420 bytes** — a 37× increase. SLH-DSA signatures at their most compact run ~3,100 bytes, a 47× increase.

This means:
- **Fewer transactions per block** — fee competition intensifies
- **Higher fees for all users** — block space becomes scarcer
- **Lightning and Layer 2 impact** — channel open/close transactions balloon in size
- **UTXO set growth** — if public keys are stored on-chain rather than in witness data

Earlier versions of BIP-360 proposed a **"quantum witness discount"** — a dedicated witness section with an additional 4× discount on top of SegWit's existing 4× discount, creating a 16× effective discount for PQ signature data (termed "quitness"). This was removed when PQ signatures were deferred to the companion BIP, but the discussion will return.

### Potential Mitigations

**Signature aggregation** is the most promising lever. If all inputs in a transaction (or even across a block) can be verified with a single aggregate signature, per-transaction overhead drops dramatically. FALCON was initially favored partly for its aggregation potential. Emerging schemes like Chipmunk and RACCOON support aggregation but produce large aggregate signatures themselves.

**Hybrid signatures** — requiring both classical Schnorr and a PQ signature — provide cryptographic redundancy (if either scheme holds, the funds are secure) but double witness data during the transition period.

**P2MR address compactness** helps at the output level: receiving addresses remain a compact 32-byte hash regardless of the eventual PQ scheme, because the full public key is hidden until spend time. The bloat hits at spend time, not receive time.

> [!tip] The Key Insight on Fees
> P2MR adoption can be measured in *migration completeness* independently of PQ signature activation. Users who move to P2MR addresses now pay normal Schnorr fees. The fee shock only arrives when PQ signature opcodes are activated and wallets switch to producing PQ signatures. These are separate events separated by potentially years.

---

## 5. The Satoshi Coin Problem: Bitcoin's Most Contentious Debate

### The Scale of Exposure

- **~1.72 million BTC** sit in P2PK outputs with public keys permanently on-chain — including Satoshi Nakamoto's estimated ~1 million BTC
- **~6–7 million BTC** total with exposed public keys (including reused P2PKH, Taproot outputs)
- **~2.3–3.7 million BTC** are estimated permanently lost (Chainalysis) — their owners cannot migrate them even with years of warning

At current prices, the vulnerable pool represents **$440 billion or more** — an unprecedented prize for whoever achieves CRQC capability first.

### The Case for Freezing / Burning Vulnerable Coins

**Jameson Lopp** published the most systematic argument in his March 2025 essay "Against Allowing Quantum Recovery of Bitcoin." His core claim: quantum-recovered coins represent a wealth transfer from all Bitcoin holders to whoever controls quantum hardware first — primarily nation-states and tech giants.

> "Think of it as a theft from everyone."

The practical proposal: a multi-year migration window followed by a soft fork that makes vulnerable outputs unspendable. Coins in P2PK outputs could be burned (sent to provably unspendable addresses) or simply made invalid.

**Pieter Wuille** (a foundational Bitcoin Core contributor) stated the position bluntly: "Of course they have to be confiscated. The Bitcoin ecosystem has no other option than softforking out the ability to spend from signature schemes that are vulnerable to QCs."

See [[bitcoin-post-quantum-sources#lopp-essay|Lopp's essay]] for the full argument.

### The Case Against Freezing

Property rights and immutability form the counter-argument. Roya Mahboob of the Digital Citizen Fund: "Freezing old Satoshi-era addresses would violate immutability and property rights." Tether CEO Paolo Ardoino suggested quantum-recovered coins "will be hacked and put back in circulation" — framing recovery as natural.

The deeper concern: who has the legitimate authority to declare any coins unspendable? Doing so would be the most significant protocol-layer property rights intervention in Bitcoin's history. It could also cause a chain split, as nodes refusing the soft fork would continue accepting quantum-spent transactions.

### Proposed Middle Paths

**Lopp-Papathanasiou Proposal (July 2025):** A three-phase sunset framework coordinated with BIP-360 activation:
1. **Phase A (Year 0+3):** Sending *to* vulnerable address types banned
2. **Phase B (Year 0+5):** All legacy ECDSA/Schnorr *spends* become invalid
3. **Phase C (Optional):** Recovery via ZK proof of BIP-39 seed ownership — though this cannot help pre-2013 coins like Satoshi's, which predate seed phrases

**Hourglass V2 (Hunter Beast):** Rate-limit P2PK spends to **1 output per block** (~144 BTC/day). At that rate, depleting the ~1.72M BTC P2PK pool takes **32+ years**, preventing catastrophic supply shock while giving any surviving key-holders time to respond. This is presented as compatible with a "soft confiscation" — coins are never formally invalidated, just made very slow to spend.

**QRAMP (Agustin Cruz):** Quantum-Resistant Address Migration Protocol — a mandatory hard deadline after which all legacy ECDSA/Schnorr spends become permanently invalid. The hardest-line proposal, requiring broad consensus that has not materialized. See [[bitcoin-post-quantum-sources#qramp|QRAMP source]].

> [!danger] Hard Fork Risk
> Cointelegraph Magazine reported in 2025 that "Bitcoin may face a hard fork over any attempt to freeze Satoshi's coins." A community split on this scale — affecting the supply, property rights, and protocol immutability simultaneously — would be without precedent.

---

## 6. The Ecosystem Response

### Institutional Attention

- **BlackRock's Bitcoin ETF filing** cited quantum computing as a material risk factor
- **The Federal Reserve** acknowledged the harvest-now-decrypt-later threat in research publications
- **CoinShares** published a formal risk assessment: "Quantum Vulnerability in Bitcoin: A Manageable Risk" (see [[bitcoin-post-quantum-sources#coinshares-report|CoinShares source]])
- **Taproot adoption dropped from 54% to 22%** of market share by early 2026 as users migrated away from P2TR's exposed internal keys following analyst warnings

### Project Eleven and the Q-Day Prize

Project Eleven launched the **Q-Day Prize** in April 2025: a 1 BTC bounty for breaking the largest ECC key using Shor's algorithm on real quantum hardware (deadline April 5, 2026). The organization raised **$6 million in funding** to defend Bitcoin from the quantum threat, establishing itself as a research node in this space. See [[bitcoin-post-quantum-sources#project-eleven|Project Eleven sources]].

### The Quantum Bitcoin Summit

A dedicated Quantum Bitcoin Summit hosted by Presidio Bitcoin in 2025 brought developers and researchers together. The emerging consensus from that event: the dual-track framework — short-term contingency measures in ~2 years, comprehensive PQ signature integration in ~7 years.

---

## 7. The Dual-Track Framework

Chaincode Labs' comprehensive May 2025 report articulated the clearest strategic framework. See [[bitcoin-post-quantum-sources#chaincode-labs-report|the full report]].

### Track 1: Short-Term Contingency (~2 Years)

- **P2MR activation** via soft fork — establishes quantum-safe output structure
- **Hourglass rate-limiting** — slows potential P2PK depletion during transition
- **Lifeboat "commit-delay-reveal" schemes** — allow users to commit to spending without revealing keys immediately, buying time in a CRQC-adjacent world
- **Ecosystem tooling** — wallet support, exchange integration, user education

### Track 2: Comprehensive Solution (~7 Years)

- **PQ signature companion BIP** — ML-DSA and SLH-DSA opcodes via OP_SUCCESSx
- **Signature aggregation** — reduce per-transaction overhead
- **Optimized algorithm selection** — based on 5+ more years of cryptanalysis
- **Complete ecosystem migration** — wallets, hardware, exchanges, protocols
- **Legacy address sunset** — coordinated deprecation of ECDSA/Schnorr spends

---

## 8. Open Questions

The path forward is technically clear enough in outline but uncertain in specifics. The questions that will determine the outcome:

**Algorithm selection:** ML-DSA (performant, newer assumptions) vs SLH-DSA (conservative, enormous signatures) vs both? The hash-only advocates argue Bitcoin should minimize its cryptographic dependency surface. The practical advocates argue 7,800-byte signatures will price ordinary users off-chain.

**Migration enforcement:** Voluntary migration + expiration deadline vs purely voluntary vs mandatory hard deadline? Each option has radically different implications for property rights and consensus mechanics.

**Satoshi's coins:** Burn them, freeze them, rate-limit them, or leave them to quantum fate? There is no option without significant costs.

**Transaction economics:** Will a quantum witness discount be sufficient to keep PQ transactions affordable? Or does PQ Bitcoin inevitably push most users to Lightning and other Layer 2 solutions?

**Timing:** With 2030 NIST deadlines and IBM's 2033 logical qubit targets, the effective migration window may be **4–7 years**. Bitcoin's governance history suggests that is barely enough time, not comfortable margin.

---

## Conclusion

BIP-360's merge into the official repository on February 11, 2026 closed one chapter and opened another. The output structure question is largely settled — P2MR is a clean, elegant solution that separates quantum-safe addressing from the harder question of quantum-safe signatures. What remains unsettled is almost everything else: which signature algorithms, whether to confiscate exposed coins, how to handle the transaction size explosion, and whether consensus can be reached before the quantum clock runs out.

The technical groundwork is real. Code runs on signet. A library exists. A summit has been held. What hasn't happened yet is the hard part — the political consensus, the economic coordination, and the social contract adjustment required to migrate a $1.7 trillion network to a fundamentally different cryptographic foundation.

Bitcoin has done hard things before. SegWit took years of acrimony and a near-fork. Taproot was smoother but still required years of soft-fork activation coordination. This migration is larger in scope and higher in stakes than either. The window is finite and the adversary — eventually — will not wait.

---

## Quick Reference

| Parameter | Value |
|---|---|
| BIP number | BIP-360 |
| Current version | v0.11.0 |
| Current name | Pay-to-Merkle-Root (P2MR) |
| Output type | SegWit v2 |
| Address prefix | bc1z |
| Merged to BIPs repo | February 11, 2026 |
| Status | Draft |
| First signet tx | September 10, 2025 |
| Authors | Hunter Beast, Ethan Heilman, Isabel Foxen Duke |
| Qubits needed to break secp256k1 | ~2,330–2,619 logical / 100K–1M physical |
| BTC with exposed public keys | ~6–7 million (~$440B+) |
| NIST PQ standards finalized | August 13, 2024 (FIPS 204, 205, 206) |

---

*For all primary sources, technical papers, and further reading → [[bitcoin-post-quantum-sources|Source Document]]*
