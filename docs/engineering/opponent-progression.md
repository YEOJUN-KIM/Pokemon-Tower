# Opponent progression v2

New runs persist `hundred-floor-v2`; schema 48 widens the progression check without
converting any existing row. v1 and legacy runs keep their generators. Packed
battles, pending event snapshots, retries and reward snapshots are not rebuilt.
Pure reference helpers default to v1; live callers explicitly pass the saved run
progression. This is intentional: changing `CURRENT_PROGRESSION` must not silently
change callers that inspect curated reference builds.

## Floor policy

| Floors | Build policy | Equipment | AI | NPC gimmicks |
|---|---|---|---|---|
| 1–10 | Aligned, readable STAB and simple attacks; no specialist pool/setup | None (explicit Master fixture: at most a berry) | basic | None |
| 11–20 | STAB, coverage, simple status; no setup | Type boosters/berries, 1–2 slots by rank | tactical | None |
| 21–30 | Reliable aligned STAB/coverage, one suitable setup/status role | Type booster/band/berries, 1–2 slots | tactical | None |
| 31–40 | Recovery, pivot, screens where learnset/stats suit them | 2–3 slots, role-compatible basic equipment | tactical; Master expert | None |
| 41–49 | Complete conventional builds, actual reference moves for named opponents | All three; competitive role equipment | Common Normal tactical; stronger ranks expert, respecting named ceilings | None |
| 50 | Regional champion identity and native late moves | All three | expert | Guaranteed representative gimmick |
| 51–60 | Every common rank has a complete role build | All three | Normal tactical; stronger ranks expert | Normal 0%; Elite starts 20%; Master 95% |
| 61–70 | Move/item compatibility; alternative suitable equipment | All three | As above | Elite probability rises gradually |
| 71–80 | Candidate matching and whole-team assignment maximize distinct roles | All three | Advanced switching where tier permits | Elite/Master/named only |
| 81–90 | Additional shared-weakness/physical-special complement scoring | All three | Common Normal also expert | As above |
| 91–99 | Complete Normal builds; rank differentiates coverage quality and selection | All three | expert (curated named ceilings preserved) | Elite up to 55%; Master 100% |
| 100 | Champion ace, maximum feasible reference-role diversity, native moves | All three | expert | Guaranteed representative gimmick |

The regional 5/10-floor schedule, two regions, three-Pokémon battle size, aces,
required members, forms, preferred lead/last rules and curated JSON are retained.
When a champion has no signature (notably Cynthia/Iris/N), v2 assigns Tera to its
existing ace. This is a tower adaptation, not a claim about their original games.
Ordinary named officers with an explicit null signature do not acquire an invented
gimmick. Named early moves/equipment are adapted through the same learning gate.

## Rank and build quality

The new prior is interpolated in `opponent-progression.ts`. A soft class preference
replaces the v1 multiplicative zeros: an ace class cannot force Elite in the early
game. Master has zero probability through 10F. The old class priors remain intact
for v1 references. Challenger offers use the same v2 floor gate.

Candidate membership still honours specialty counts and the actual floor pool.
BST bias is reduced (Elite 1.5, Master 3 instead of 4/8). The existing combination
selector gains role matching and late weakness/physical-special scoring. It never
widens the pool just to obtain a gimmick or role. At 71F+, a role assignment is
chosen for the whole triple instead of three independent greedy choices. When a
constrained pool cannot supply three roles, the maximum feasible diversity is
used. Named late triples are scored using their actual reference moves, not
imagined roles they could theoretically learn.

The new move builder uses legal learnsets and Showdown set validation, aligns
attacks with species offence (including the existing Huge/Pure Power logic),
requires matching attacks for setup, and prefers distinct coverage. Rank changes
the weight of additional super-effective coverage. Roles include attacker, bulky
attacker, setup, pivot, status, screens, defensive and revenge. Species with
nonstandard win conditions retain their legal specialist builds after 31F.

Choice/Assault Vest equipment requires an all-attacking set. Screens favour Light
Clay, pivots Boots/Leftovers, defensive roles Leftovers/Helmet, fragile setup Sash,
and offence Life Orb/appropriate Choice equipment. Equivalent role-compatible
alternatives vary by seed; Master more strongly favours the top choice. Team item
duplicates are avoided. Mixed attackers keep a neutral nature instead of reducing
one of their actual attacking stats.

From 51F, native Grassy/Electric/Psychic Surge may replace the default ability
when the actual attacks benefit and legality is valid. Grassy Surge avoids own
Earthquake and Psychic Surge avoids own priority. This supplies occasional terrain
without forcing a field strategy onto unrelated species. Ordinary generated builds
exclude delayed Future Sight-style attacks that this generic AI does not schedule.
The final setup guard also checks the selected four moves, not just the candidate
pool, and repairs a set that lost its two matching attacks during coverage choice.

`BuildSupportPolicy` is opt-in in the saved NPC AI descriptor. It deploys screens,
hazards and supported status/recovery/weather moves with HP/risk/KO guards and
public-field memory. Existing policies and saved descriptors are unchanged.
Existing advanced switching, resource-aware Z decisions and regional ace policies
are reused. This remains a public-information heuristic, not a search engine.

IVs and point budgets now have narrower rank gaps. The 50F named budget is 37,
compared with 27/31/35 common-rank budgets at 49F, rather than the old named 46
against Normal 8. At 100F the named budget is 50 rather than 66. No base-stat,
damage or defence multiplier was added. Normal late point budgets do rise; the
audit reports this explicitly alongside build/role changes.

## Optional content, player equipment and economy

For new runs, ordinary/challenger/named opponents cannot use gimmicks at 1–49F.
NPC gimmicks are independent of the player's selected rule, as named NPCs already
were. Chaos selects a gimmick family before selecting its carrier/crystal to avoid
counting every Z crystal as another family ticket.

Random raids are deferred until after the 50F gate; their phase definitions,
rewards and battle mechanics are unchanged. Mirror offers are deferred until after
50F to avoid copying early purchased gimmicks. Other event choice/reward/track
logic is retained. Existing pending raid/mirror snapshots are still resumable.

Shop cadence, prices, weights, reward amounts and currency formulas are unchanged.
Players may buy equipment early, but the battle service locks its activation until
50F on v2 runs, and the shop displays this restriction. There is **no new guaranteed
51F equipment purchase or affordability guarantee**; economy tuning is explicitly
outside this change. Rank frequency changes can indirectly affect realised coin
income even though payout formulas were not edited.

Paradox clarification: this Dex gives Iron Crown/Iron Boulder/Raging Bolt/Gouging
Fire empty tags and the roster marks them non-legendary. They pass the actual
common filter and are preserved. A tag-list description alone is insufficient to
infer the effective eligible pool.

## Verification and measurement

`tests/build-progression.test.ts` covers all-floor/rank legality, early gates,
setup compatibility, item restrictions, late Normal variety, every region's gates,
schema migration, player activation, raid eligibility and actual screen use.
Existing curated reference tests explicitly pin v1, while live v2 flow tests check
the new policy. Full tests also cover reconnect/retry and event rewards.

Run `node --import tsx scripts/audit-build-progression.ts 1000`, then
`node --import tsx scripts/compare-build-progression.ts 1000` against the saved v1
raw audit. Outputs live in `artifacts/build-progression-audit/`. Each run uses the
same deterministic run ID/floor seed schedule as the original audit. Optional
events and actual player progression/win rates are separate from the 100-floor
encounter distribution. Roles are explicit code-based classifications, not
claims of tactical success. Role duplication can remain for constrained specialist
or named parties; the final report quantifies this rather than asserting zero.
