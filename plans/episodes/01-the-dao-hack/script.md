# Episode 1: The DAO Hack, 10 Years On

**Status:** draft 2, fact-checked 2026-11-16. All 32 historical claims were checked against sources; see `fact-check-and-show-notes.md`. The `[DATA]` values must be refreshed on recording day.
**Target runtime:** 20:00 (about 2,500 narration words plus about 3:30 of archive clips)
**Archive sources:** TBP68 *Deconstructing TheDAO Attack* (2016-06-27); HIO #92 *DefiSafety, Rex Hygate* (2020-09-19); TBP #274 *Mmm DAO DAO* (2019-09-19)

**Markers**
- `[CLIP n]`: archive audio. Source, timestamp, speaker and the exact transcript words to find it by. Cut 2–3s before the quote and end on a natural pause.
- `[CHART]`: on-screen graphic for the YouTube cut. In the audio-only cut, the narration already says the number aloud.
- `[DATA]`: a number to pull on production day from the source named. Never hard-code a live number.

---

## COLD OPEN (0:00–0:40)

**[CLIP 1 | TBP68 @ 27:54 | Emin Gün Sirer | ~15s]**
> "…it's much more like writing code for a nuclear power reactor than it is like writing code for Node.js."

**NARRATOR:**
June 2016. A Cornell computer scientist is on The Bitcoin Podcast, ten days after the biggest experiment in Ethereum's short life lost a third of its money to one bug. He's explaining why smart contracts are not like normal software.

Ten years later, we check what he got right, what the hosts got wrong, and why the same bug class is still taking money from crypto users in 2026.

This is *Then / Now*, from The Bitcoin Podcast archive. Today: the DAO hack.

**[STING]**

---

## THE BRIEF (0:40–2:00)

**NARRATOR:**
Three numbers to keep in your head for the next twenty minutes.

**[CHART: three tiles]**

**About 12 million ether.** That's what the DAO raised in its crowdsale, which ran from April 30th to May 28th, 2016. The SEC later valued it at roughly 150 million dollars at the time, and it was roughly 15 percent of all the ether that existed.

**About 3.6 million ether.** That's what the attacker drained, starting June 17th, 2016. In the SEC's own words, that was a third of everything raised.

**Block 1,920,000.** That's where, on July 20th, 2016, Ethereum hard forked to reverse the damage, and split into two chains that still exist today.

The thesis of this episode: the DAO wasn't killed by a broken blockchain. The chain worked perfectly. It was killed by a broken *contract* and a broken *process*. That distinction matters, because every major DeFi failure since has followed the same pattern: the chain works, and the code on top of it fails.

---

## THEN: JUNE 2016 (2:00–6:30)

**NARRATOR:**
To understand the panic, you have to understand what the DAO was supposed to be.

It was a venture fund with no managers. You sent ether to a smart contract, and you got DAO tokens back. Token holders would vote on which projects to fund, and the contract would pay out automatically. There was no board, no custodian and no off switch. The company behind most of the code, Slock.it, was itself expected to pitch for funding. It was the purest form of an idea people were calling "code is law."

Three years later, on this show, the hosts put it this way:

**[CLIP 2 | TBP #274 @ 8:29 | host | ~12s]**
> "And it had this really, really strong branding at the time, which is code is law, right?"

**NARRATOR:**
The money came in fast. More than eleven thousand investors bought in, and by the end of the sale it was being called the largest crowdfunding in history. In the archive, our 2016 guest put the raise at more than 200 million dollars. That's fair as a peak figure: ether hit about 21 dollars and 50 cents on June 17th, which made the DAO's holdings worth roughly a quarter of a billion dollars on paper, on the very day they were stolen.

Then, on June 17th, someone found the hole.

**[CHART: simplified flow: attacker contract ↔ DAO "split" function, a loop arrow labelled "call again before balance updates"]**

The DAO let unhappy investors leave through a function called "split." It sent your ether out to a new child DAO, and *then* updated your balance. That order is the whole bug. The attacker wrote a contract that, when it received ether, immediately called split again, before the DAO had recorded that it had already paid. Withdraw, re-enter, withdraw again. This is called **reentrancy**, and it's the most famous bug in smart contract history.

The drained ether landed in the attacker's own child DAO. Because of the DAO's own rules, those funds couldn't be moved for 27 days. That window is the only reason a rescue was possible at all. The DAO was autonomous, so it couldn't be stopped. Sirer, on our show, didn't hold back about that design choice:

**[CLIP 3 | TBP68 @ 22:16 | Emin Gün Sirer | ~15s]**
> "Well, there were absolutely no escape hatches built into this particular construct. In fact, it was probably engineered to not have any escape hatches."

**NARRATOR:**
He also put the blame exactly where most security researchers would put it today. He didn't blame Ethereum's virtual machine. He blamed the tooling and the people around it.

**[CLIP 4 | TBP68 @ 25:02 then 27:00 | Emin Gün Sirer | ~25s, two cuts]**
> "The EVM is blameless in all of this. There is no EVM bug that was affected in this hack…"
> "And there is some blame to be levied against solidity in the sense that there was this problem about calls to external contracts. And we just, you know, we knew it."

**NARRATOR:**
"We knew it." That's the uncomfortable part. Warnings about this exact pattern were public before the attack. On June 9th, developer Peter Vessenes published a post titled "Race-To-Empty is the Real Deal." On June 12th, five days before the hack, Slock.it published a post headlined "No DAO funds at risk" following the recursive call bug discovery. Sirer said the team moved too fast, hyped it too hard, and needed, in his words, "another six months of scrutiny."

There was also an ugly side story. Slock.it's Stephen Tual publicly accused Sirer of knowing about the bug and not disclosing it, and anonymous trolls escalated that into calling *him* the hacker. Sirer called that, accurately, "a felony accusation." Hold that thought: who the attacker actually was is one of the most-researched questions of this whole saga, and we'll get to it.

Meanwhile, the remaining ether was still sitting in a contract that anyone could drain the same way. So on June 21st, a group of white-hat developers, nicknamed the "Robin Hood" group in the press, did exactly that. They used the attacker's own technique and moved about 7.2 million ether somewhere safe, roughly 70 percent of the DAO's funds. The hosts described the strange situation as it happened:

**[CLIP 4c | TBP68 @ 7:13 | host | ~15s]**
> "So we have this, what's currently going on, we have these white hack attacks that have essentially done the same thing that the attacker did to the DAO to move all of the remaining funds into a separate DAO"

**NARRATOR:**
Think about what that means. The "good guys" and the "bad guy" were running the same exploit against the same contract. The only difference was intent. That's the core problem with "code is law": the code can't tell a heist from a rescue.

The fight that summer came down to one question: do you change the chain to undo a theft that the code technically allowed? In 2016 the hosts saw it plainly:

**[CLIP 5 | TBP68 @ 7:38 | host | ~12s]**
> "…they have the exact same code as the original DAO which means this can just keep going on forever under the current… the only way to really fix this cleanly is to hard fork"

---

## NOW: WHAT ACTUALLY HAPPENED (6:30–12:30)

**NARRATOR:**
So let's score it.

**The fork happened.** First, developers proposed a *soft* fork that would freeze the attacker's funds. That plan died on June 28th, when researchers, Sirer among them, published a paper showing it opened a denial-of-service hole in the network: miners would have had to run the attacker's transactions just to discover they should throw them away, without earning any fees. Then came an informal coin vote, called Carbonvote. Only about 5.5 percent of all ether took part. Of that, about 87 percent voted yes to a hard fork, and roughly a quarter of the "yes" ether came from a single address. Remember that number when we get to DAO voting later.

Why could Ethereum even do this cleanly? Sirer explained it on our show, and it's a detail most coverage skips. Bitcoin tracks coins as unspent outputs, so undoing one theft would mean rolling back every transaction after it. Ethereum keeps a running balance for every account:

**[CLIP 5b | TBP68 @ 1:02:44 | Emin Gün Sirer | ~12s]**
> "But with Ethereum, they have almost like a separate ledger. It's just balance."

**NARRATOR:**
So instead of rewinding the chain, a fork could simply *edit balances*. It could take the ether sitting in the DAO and the attacker's child DAO and move it into one new contract, and leave every other transaction on the network alone. That's a surgical fix that Bitcoin's design doesn't allow, and it's the reason this fork was even on the table.

On July 20th, 2016, at block 1,920,000, Ethereum changed its own history. The DAO's ether was moved into a simple withdrawal contract. Any DAO token holder could trade 100 DAO tokens for 1 ether, the base crowdsale rate. One wrinkle: the price had risen toward the end of the sale, so the latest buyers got back a little less than they paid.

**[CHART: one chain splitting at block 1,920,000 into "Ethereum (ETH)" and "Ethereum Classic (ETC)"]**

**The chain split.** A minority refused the fork and kept running the original chain, where the hack was never reversed. That chain is Ethereum Classic. It still exists. Its security record since then makes the case for why hash power matters: Ethereum Classic suffered a deep chain reorganization in January 2019, widely reported as a 51 percent attack, in which over a million dollars' worth of ETC was double-spent. Then came three more attacks in August 2020, the largest rewriting more than 7,000 blocks.

Here's the scoreboard ten years on:

**[CHART: ETH vs ETC, market cap side by side]**
`[DATA: refresh on production day. As of 2026-11-16 (CoinGecko): ETH $222.2B / $1,817; ETC $0.94B / $5.91; ratio ~237x]`

Ethereum, the chain that reversed the hack, is worth roughly 240 times more than the chain that didn't. Whatever you think about the ethics of "code is law," the market voted.

**Did the hosts' price calls hold up?** In June 2016, a host said ether wouldn't "dip too far below ten dollars." It did. Ether had hit an all-time high above 21 dollars on the very day of the hack. The next day it was under 10. By December 6th, 2016, it briefly touched just under 6 dollars. Score that one as wrong short term and right long term: as we record, ether trades around 1,800 dollars, about 300 times that 2016 low. `[DATA: refresh price]`

Another host made a sharper call on DAO tokens. He pointed out that if a fork refunded tokens at a fixed rate, anyone who'd bought them cheaply on an exchange after the crash would come out ahead. The logic held. The refund paid a flat 1 ether per 100 DAO, no matter what you'd paid for them.

**The fork never happened again.** That's the part people forget. In November 2017, a bug in the Parity multisig wallet library let one user accidentally take control of a shared library and destroy it, freezing about 513,000 ether across hundreds of wallets. A proposal to unfreeze it with another fork, EIP-999, went to a coin vote in April 2018. It lost, roughly 55 percent against to 39 percent for. No recovery has ever been enacted. So the DAO fork wasn't the start of a habit. It was a one-time exception, made when the stakes were existential: the DAO held a big enough share of all ether that leaving it with an attacker threatened the network itself. Sirer pointed to exactly that risk at the time, noting that a planned move to proof of stake made it "a little dangerous" to have a hacker holding that much of the supply.

**The regulator showed up.** On July 25th, 2017, the SEC published what's now called the DAO Report. It concluded that DAO tokens were securities under the Howey test, and that "decentralized" or "autonomous" labels don't change the analysis. The SEC chose not to bring charges, but that report became the basis for the SEC's treatment of ICOs during the 2017 boom.

**And the attacker?** For six years, nobody could say publicly who it was. In February 2022, journalist Laura Shin, working with blockchain analytics firm Chainalysis, reported that the trail pointed to Toby Hoenisch, a Singapore-based developer and former CEO of the startup TenX. Hoenisch called that conclusion "factually inaccurate," and no charges have ever been reported. So it remains an allegation. But it does mean that when anonymous trolls in 2016 accused Emin Gün Sirer, the best evidence available today points somewhere else entirely.

---

## MECHANISM: WHY THIS BUG WON'T DIE (12:30–17:00)

**NARRATOR:**
Here's where it gets interesting for builders. In 2016 Sirer made two predictions on this show.

**[CLIP 6 | TBP68 @ 36:10 then 36:36 | Emin Gün Sirer | ~20s, two cuts]**
> "I think on the whole and in the long term, I am supremely positive about Ethereum. It's going to be much more robust."
> "And I don't know that Solidity itself needs to change, but we need to build some infrastructure on top that allows people to write secure code."

**NARRATOR:**
Score the second one first, because it's the most specific.

**Infrastructure on top: yes, and that's mostly how it went.** Solidity did change at the edges. But the big shift was everything built around it. The rule that would have saved the DAO now has a name: *checks, effects, interactions*. Check the conditions, update your balances, and only *then* call out to anyone else. The DAO did it backwards. Libraries like OpenZeppelin ship a ready-made `ReentrancyGuard`, a lock that stops a function being re-entered mid-call, first added in 2017, and it's now standard in serious contracts. Add static analyzers, fuzzers, formal verification, and bug bounty platforms. Immunefi alone reports paying out more than 100 million dollars for critical bugs since 2021.

Sirer went further. He asked for something specific:

**[CLIP 7 | TBP68 @ 41:55 | Emin Gün Sirer | ~12s]**
> "So here is a set of circumstances where if this happens, then I want you to shut down the contract and put it into a fail-safe mode."

**NARRATOR:**
That's an invariant-triggered circuit breaker. Today most major DeFi protocols ship some version of it: pause guardians, rate limits on withdrawals, and timelocks on upgrades. In 2023 someone even proposed an official Ethereum standard for circuit breakers, ERC-7265, though it was never adopted. The "no escape hatches" philosophy of 2016 lost. Almost no serious protocol launches without an emergency brake today, and that brings a different risk: whoever holds the brake.

**Now the uncomfortable part: reentrancy never went away.** In July 2023, the Curve Finance ecosystem lost somewhere between 50 and 70 million dollars, depending on how you count recoveries, to a reentrancy bug. This time the flaw wasn't in the developers' code. It was in three old versions of the *Vyper compiler*, where the reentrancy lock itself silently didn't work. Seven years after Sirer said "there is some blame to be levied against" the language tooling, the tooling was the bug.

**[CHART: crypto stolen in hacks per year, Chainalysis: 2021 ~$3.3B · 2022 ~$3.8B · 2023 ~$1.7B · 2024 ~$2.2B · 2025 ~$3.4B]**

And zoom out: the industry still loses billions a year to hacks. 2022 was the record, at about 3.8 billion dollars, according to Chainalysis. On February 21st, 2025, a single attack on the exchange Bybit took about 1.5 billion dollars in ether. The FBI attributed it to North Korea. Notice what *that* was: not a smart-contract bug. Attackers compromised a developer's machine at the wallet provider Safe and planted code in its interface, so Bybit's signers approved a transaction that wasn't what their screens showed them. The weak point keeps moving up the stack, from code to keys to humans.

Which brings us to the second lesson, the one that took longer: **audits are a process, not a stamp.**

By 2020, this show was interviewing Rex Hygate, who started following Ethereum, in his words, "right after the DAO." He built DefiSafety to grade how projects are built, not just whether someone audited them. He named the industry's structural flaw before most people did:

**[CLIP 8 | HIO #92 @ 24:21 + 26:12 | Rex Hygate | ~25s, two cuts]**
> "Because frankly, we get paid by the developer, right?…"
> "You go back, you look at the rating agencies in 2008. You know, you had a perfectly good system where the ratings were paid for by the people who were getting the ratings."

**NARRATOR:**
He was just as candid about the limits of his own product:

**[CLIP 8c | HIO #92 @ 31:04 | Rex Hygate | ~10s]**
> "I don't read the code. I don't go over what the code does. So that's a huge hole."

**NARRATOR:**
That honesty matters, because it shows that "security" in crypto is really several separate checks, and each one misses something. A process score tells you whether a team documents, tests and publishes its code. An audit tells you what a specific reviewer found in a specific version on a specific date. A bug bounty tells you what the price of silence is. None of them, alone, tells you a contract is safe. The DAO had a well-known development team, public code, and an outside security review by the firm Deja Vu Security, and it still failed.

The auditor is paid by the audited. That's the same conflict that let ratings agencies stamp AAA on mortgage bonds before 2008. Hygate's warning still applies: after many hacks, people open the audit report and find that the auditor flagged the problem, or found it but never saw the deployed fix, or never reviewed the deployed code at all.

---

## SIGNAL VS. NOISE (17:00–19:30)

**NARRATOR:**
Rapid fire. Five claims from the archive, scored.

**[CHART: scorecard, five rows, "Then" / "Now" / ✅ ❌ 〰️]**

**One. "Ether won't dip far below ten dollars."** June 2016. ❌ in the short run. It touched just under six by December. ✅ in the long run.

**Two. "Ethereum is going to be much more robust."** Sirer, June 2016. ✅. Ten years, one of the largest smart-contract ecosystems in the world, and the move to proof of stake he mentioned on our show, which finally shipped on September 15th, 2022, more than six years later.

**Three. "Any DAO released will have 1 percent of owners holding 99 percent of the value."** A host, 2019. Mostly ✅. In 2022 Chainalysis studied ten major DAOs and found that in several of them, fewer than 1 percent of holders had 90 percent of the voting power. That's not 99, but the direction was right.

**Four. "DAOs are an inevitable consequence of smart contracts."** 2019. ✅. They're everywhere, governing protocol treasuries worth billions of dollars. They're also legally recognized now: Vermont created a blockchain-based LLC in 2018, Wyoming's DAO LLC law took effect in July 2021, and Utah's DAO Act took effect in January 2024.

**Five. "Low voter turnout is a big problem."** 2019. ✅, and still true. One academic study put average DAO voter participation at around 6 percent, which means decisions are often made by big holders and delegates. That echoes Carbonvote back in 2016, where a quarter of the "yes" ether came from a single address.

---

## CLOSE (19:30–20:30)

**NARRATOR:**
So what's the one thing to take from the DAO, ten years on?

The blockchain did exactly what it was told. The fork showed that "code is law" is a choice a community makes, and it can choose differently. Every major failure since has looked the same: sound base layer, fragile layer on top.

Emin Gün Sirer said it best on this show, ten days after the hack:

**[CLIP 9 | TBP68 @ 35:41 | Emin Gün Sirer | ~12s]**
> "so just like the Tacoma Narrows bridge you know spectacular failure absolutely horrible to watch very dramatic but we learned how to build big bridges after that"

**NARRATOR:**
And we did learn. Today's protocols ship with reentrancy guards, emergency brakes, staged rollouts and bounties that would have caught the DAO's bug in an afternoon. But the bridges got bigger too. In 2016 the whole DAO held about 150 million dollars. Today the largest DeFi protocol, Lido, holds nearly 18 billion dollars `[DATA: refresh, DefiLlama; 2026-11-16: $17.8B]`, and the attackers are state-funded teams. Ten years later, we're still learning, one exploit at a time.

Every fact in this episode is dated and sourced in the show notes, along with links to the full archive episodes we quoted.

Next time on *Then / Now*: Lightning. In 2016 the hosts expected it to scale Bitcoin to the world. We'll check the channel data.

**[OUTRO STING]**
