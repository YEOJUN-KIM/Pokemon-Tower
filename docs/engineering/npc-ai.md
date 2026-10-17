# NPC AI tiers (tower-policy-v11)

## Existing policies and compatibility

| Policy | Capability added | Archived version |
| --- | --- | --- |
| TowerPolicy | Damage, recovery, status, setup, Counter/Mirror Coat/Destiny Bond | v2 |
| LegacyGimmickPolicy / GimmickPolicy / TeraPolicy | Mega, Dynamax, Tera | v3 / v4 / v5 |
| SwitchingPolicy / CautiousSwitchingPolicy | Matchups, entry hazards, own immunity, finishing/boost guards, bounded switches, trapping warning | v6 / v7 |
| LearningOpponentPolicy | Public immunity evidence, alternative attacks and safe response switches | v8 |
| ZMovePolicy | Learning plus Z move timing | v9 / v10 |

Before this change, modern encounters shared v10; legacy progression used v9.
v10 also restores independent NPC gimmick rules from packed teams in BattleSession.
Raid uses that same v10 policy with its separate engine rules.

v11 selects existing layers in `createNpcPolicy`:

* **Basic:** TowerPolicy; ordinary moves and forced replacements only.
* **Tactical:** CautiousSwitchingPolicy plus the shared Z move timing helper.
* **Expert:** ZMovePolicy (including LearningOpponentPolicy).

The old classes retain their decisions when constructed without the optional
score callback. v2–v10 and damage-policy-v1 remain accepted by TowerService.
Both v10 and v11 restore independent NPC gimmick rules and the saved Tera carrier.
Raid remains on v10. No Raid QA/encounter setting changed.

## Selection and ceilings

`npcAi(floor, sample, options)` calculates decision capability independently of
level, IVs, EVs, damage, held items, movesets, and team composition.

Floor baseline: 1–19 Basic, 20–49 Tactical, 50–100 Expert. This uses the actual
floor, including chapter two and Teleport destinations, without rescaling stats.

| Encounter | Effective tier/default ceiling |
| --- | --- |
| Ordinary NPC / normal rank Challenger | Floor baseline, capped at Tactical |
| Elite/Master common NPC | At least Tactical; Expert at 50+ |
| Named / gym | At least Tactical; Tactical ceiling before 40, Expert ceiling from 40 (Expert baseline starts at 50) |
| Elite Four | At least Tactical; Expert at 50+ |
| Champion / final 50F or 100F boss / hidden final boss | Expert |
| Organization grunt | Basic before 20, then Tactical |
| Organization executive (including Rocket Archer) | Tactical ceiling, at least Tactical |
| Organization leader (including Rocket Giovanni) | Expert |
| Master Challenger | Expert even at low floors |
| Raid | Existing v10 path and special battle rules |

`TrainerSample.aiCeiling` and `NpcSample.aiCeiling` are optional. Explicit
ceilings always win, including an explicitly Basic named opponent. Named and
elite encounters have a Tactical minimum before applying their ceiling. Leader
metadata is stored with the samples; policies contain no NPC identity checks.

## Tactic

The existing seven tactics are reused: balanced, physical, special, speed,
status, setup, bulk. Previously they affected team/move/training generation,
not turn decisions. No separate personality or Pokemon role system was added.
Existing encounter `role`, `kind`, and `npcRank` drive tier selection.

The optional common TowerPolicy scoring callback adds at most five points:

* balanced: zero bias;
* physical/special: up to 6% for the respective attack category;
* speed: up to 6% for priority and pivot attacks;
* status: +5 for viable Toxic, Will-O-Wisp, Thunder Wave and Leech Seed;
* setup: +5 for viable existing setup moves above 70% HP;
* bulk: +5 for viable recovery at <=50% HP or disruption above 50% HP.

Zero-score moves never gain a preference. Status moves gain no preference
against a nearly defeated opponent or when an estimated finishing attack is
available. Existing immunity, status, repeated setup and healing gates remain.
Bias never overrides switching guards or introduces randomness.

## Persistence and public information

The resolved `{tier,tactic}` is persisted as `npcAi` inside the existing boss or
trainer JSON; `ai_version` is still stored in the battles table. No DB migration
is necessary. Reconnect uses these saved values and reconstructs policy state
by replaying accepted inputs and public events. Retry copies the same version,
NPC JSON, opponent team, seed and rewards through the existing SQL path.

Trainer event snapshots (Rocket and hidden boss) freeze `aiVersion` and
`trainer.npcAi` when created. Challenger candidates freeze their version and
configuration before selection. Pre-tier pending snapshots without these
fields retain v10 (v9 for legacy progression). Existing battle rows never get
upgraded. Snapshot/reward lifecycle and recruitment rules are unchanged.

Expert receives its own request, public species/HP, public switching context
and protocol events excluding private requests. Existing immunity evidence is
scoped to the current opponent entry and reset on public identity/type changes;
this change does not add a cross-entry scouting database or search ahead into
the engine. Opponent move knowledge is the existing public last move. Hidden
sets, held items, unrevealed abilities, player inputs and future RNG are not
available to the policy.

## Verification

`tests/npc-ai.test.ts` covers capabilities, immunity learning, all four active
gimmicks, scoring bounds, all sample ceilings/defaults, frozen settings,
retry/reconnect, archived policy acceptance, deterministic real battles,
decision replay, and complete v10/v11 Expert balanced history equivalence.
Rocket regression tests also assert the saved version/configuration on entry
and retry. Existing Raid, Challenger, hidden boss and Teleport suites exercise
their original lifecycle paths. See the implementation report in the chat for
the commands actually executed and their results.

Final verification (2026-10-18):

* `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`: 749 passed.
* `node node_modules/typescript/bin/tsc --noEmit`: passed.
* `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`: passed.
* `node --import tsx node_modules/@playwright/test/cli.js test e2e/switch-policy.spec.ts e2e/villain-campaign.spec.ts e2e/challenger-events.spec.ts e2e/raid-events.spec.ts e2e/teleport.spec.ts --reporter=line`: 37 passed.

The switching E2E fixture explicitly selects v6 or each v11 tier, uses current
account authentication, and isolates its test signup quota. Desktop and mobile
checks demonstrate Basic staying in and Tactical/Expert switching, then verify
the saved configuration and battle state after reload.
