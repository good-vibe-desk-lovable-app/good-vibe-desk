# Palworld 1.0 Reference

**Document status:** Priority-one reference completed; later sections are intentionally deferred rather than populated with unsourced or stale claims.
**Last verified:** 20 August 2026
**Current cited data version:** PalDB 1.0.3 (12 August 2026) where stated; Pocketpair’s 1.0 official-release changelog for official claims.
**Repository scope:** Documentation only. This file does **not** modify application data, models, or pipeline behavior.

## Reading this document

This is the durable, source-backed starting point for work on Palworld 1.0 mechanics in this repository. It completes the brief’s highest-priority questions: egg production, mutation, egg-size variation, egg types, hatch time, Pal-Gear Partner Skills, and the Ancient Hatchery. The document deliberately stops there. The governing brief explicitly prefers a reviewed Priority §1 over guesses in later sections.

Every factual table labels its source tier using the project hierarchy: **datamined** > **official** > **wiki** > **community**. A value is never inferred merely because it is plausible. `UNKNOWN` means no sufficiently specific evidence was found, and each gap includes a resolution path.

> **Critical correction to the former model:** a breeding result is not a single immutable object determined entirely when an egg is laid. Ordinary species selection occurs in the breeding system, but manual pickup can add Alpha state or an extra egg through Pal-specific Partner Skills, and the Ancient Hatchery claims a separate rare-skill inheritance effect. The available public evidence does **not** say that any Partner Skill directly rerolls a child’s species.

## Evidence standard

| Source tier   | Meaning in this reference                                                 | Examples used here                                                                  |
| ------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **datamined** | Game-file extraction or code-facing data that identifies its source.      | PalCalc’s published `db.json`, used only for the claims it actually exposes. [2]    |
| **official**  | Pocketpair’s own release notes or official publication.                   | The v1.0 release changelog. [1]                                                     |
| **wiki**      | Structured wiki/database pages without a disclosed raw extraction method. | Palworld Wiki, PalDB. [3] [4] [5] [6]                                               |
| **community** | Guides, player tests, discussions, calculators, and pooled observations.  | Game8, 4Netplayers, BisectHosting, Reddit, Steam Community. [7] [18] [19] [20] [21] |

Where sources conflict, the conclusion and reason are stated in the discrepancy log rather than averaged.

### Structured catalogue precedence over single-page sources

> **Methodological Rule:** Information sourced from a single web/wiki page is untrusted whenever the same subject exists in a structured catalogue already present in the repository.
>
> *Case Study (Incubators):* Two independent data collection efforts previously recorded only two incubators by relying on a single wiki page summary. However, querying the 588-row structured technology dataset (`knowledgeTechnologies.ts`) already in the repo reveals five distinct hatching structures across levels 10, 36, 48, 58, and 76, plus the level 19 Breeding Farm structure. Datasets and pipeline emitters must always source claims from existing structured catalogue datasets in preference to isolated single-page summaries.

---

# §1 — Priority mechanics affecting the application

## 1.1 Ancient Hatchery

The exact in-game name is **Ancient Hatchery**. “Ancient Breeding Facility” is a descriptive guide phrase, and “Ancient Breeding Incubator” / “Ancient Pal Incubator” should not be used as the canonical name. The structure is described as an advanced breeding facility that automates production through incubation at high speed and **increases the inheritance rate of rare skills**. It is unlocked at Level 76 for 8 Ancient Technology Points, holds ten eggs, and PalDB lists `+100%` incubation speed. [3] [4] [7]

| Attribute                                                                      | Value                                           | Source tier                                                                                       | Date checked |
| ------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------ |
| Canonical name                                                                 | Ancient Hatchery                                | wiki [3] [7]                                                                                      | 2026-08-20   |
| Unlock                                                                         | Level 76; 8 Ancient Technology Points           | wiki [3] [7]                                                                                      | 2026-08-20   |
| Capacity                                                                       | 10 eggs                                         | datamined-style database presentation [4]                                                         | 2026-08-20   |
| Incubation modifier                                                            | `+100%` incubation speed                        | datamined-style database presentation [4]                                                         | 2026-08-20   |
| Declared passive effect                                                        | “increases the inheritance rate of rare skills” | wiki [3] [7]                                                                                      | 2026-08-20   |
| Exact rare-skill modifier, target ranks, selection order, and cake interaction | **UNKNOWN**                                     | No numeric or raw effect-table extraction located.                                                | 2026-08-20   |
| Mutation-rate or mutation-species modifier                                     | **UNKNOWN**                                     | No authoritative source specifies one. A community guide says no direct mutation-rate bonus. [18] | 2026-08-20   |

The Ancient Hatchery is therefore **not merely a faster incubator**. It belongs in any future breeding model because it claims an offspring passive-inheritance effect. It is not currently valid to say that it changes a mutated egg’s species, that it rerolls mutation selection, or that it changes Alpha state.

### Manual farm versus Ancient Hatchery

| Route                                                | Evidence-backed advantage                                                                                       | Important qualification                                                                                                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Breeding Farm, manual collection, ordinary incubator | The manual-pickup stage can trigger Broncherry, Broncherry Aqua, and Grintale Partner Skills. [8] [10] [12]     | Requires manual collection and ordinary incubation management.                                                                                                                          |
| Ancient Hatchery                                     | Automated breeding/incubation, +100% incubation speed, and stated rare-skill inheritance advantage. [3] [4] [7] | Community sources say manual-pickup Partner Skill effects are bypassed because no manual pickup occurs. This is practical community evidence, not a published blueprint rule. [18] [19] |

## 1.2 When is an egg outcome chosen?

The project must use a staged model. The table identifies what is established at each stage and explicitly distinguishes actual game mechanics from the present application.

| Pipeline stage                                               | Current evidence                                                                                                                                                                                                     | Source tier      | Does the app currently model it?                                                                                                                                           | Notes                                                                                                                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parent-pair eligibility and ordinary child-species selection | Opposite-gender parents and cake are required on the Breeding Farm. The ordinary resolver averages breeding rank, checks unique combinations first, and resolves ties by the documented priority/index sequence. [5] | wiki             | **Yes, species selection.** The pathfinder resolver implements formula, unique-combination, same-species, variant, and tie-break behavior in `src/lib/pathfinder/core.ts`. | The app’s selected collection data can store gender; the resolver’s gender enforcement is optional, not a complete simulation of the farm.                                                            |
| Egg laid / normal egg size and type display                  | The app stores one `eggSize` and one `eggType` per species and displays them in results.                                                                                                                             | repository       | **Static display only.** All current records use `eggType: "Common"`; the field is not a verified bred-egg model.                                                          | Alpha size variation is not represented.                                                                                                                                                              |
| Mutation creation                                            | Pocketpair says mutation is a low-chance breeding outcome that produces a stronger Pal with higher stats and a unique passive. [1]                                                                                   | official         | **No.**                                                                                                                                                                    | The app intentionally does not simulate mutation rate, species selection, rank, passive, Alpha state, or condensation result.                                                                         |
| Alpha roll and post-lay Alpha conversion                     | Current Wiki documentation describes a 5% Alpha chance for bred Pals, independent of parents; Broncherry skills can convert manually picked-up eggs to Alpha eggs. [5] [8] [9] [10] [11]                             | wiki             | **No.**                                                                                                                                                                    | Do not treat normal `eggSize` as a complete outcome representation.                                                                                                                                   |
| Manual pickup / extra egg                                    | Grintale can award one extra egg on manual pickup; Broncherries can convert it to Alpha. [8] [10] [12]                                                                                                               | wiki             | **No.**                                                                                                                                                                    | The app assumes one outcome per pathfinder step.                                                                                                                                                      |
| Passive inheritance                                          | The app’s expected-egg calculation uses the published `40/30/20/10` inherited-count weights. [2] [5]                                                                                                                 | datamined / wiki | **Partial, approximate.**                                                                                                                                                  | Random passive identities, duplicates, and intermediate-child distributions are not public enough to make multi-step expected eggs exact. See `src/lib/pathfinder/inheritance.ts` and `modelGaps.ts`. |
| Active-skill inheritance                                     | The official 1.0 changelog says the inheritance rule changed, but this reference has not compiled an exact 1.0 rule from a primary extraction. [1]                                                                   | official         | **No.**                                                                                                                                                                    | **UNKNOWN** in this Priority §1 document.                                                                                                                                                             |
| IV/stat-potential realization                                | Community/wiki sources describe parent and random rolls, but no confirmed rule is included here.                                                                                                                     | community / wiki | **No.**                                                                                                                                                                    | **UNKNOWN** for current modeling purposes.                                                                                                                                                            |
| Incubation time                                              | Egg type, size, temperature comfort, world settings, and incubator/Partner-Skill effects affect time. [4] [6] [16]                                                                                                   | wiki             | **Static estimate only.** `HATCH_TIME` currently shows `3–6h`, `18–36h`, and `36–72h` by Normal/Large/Huge size.                                                           | No temperature, world-setting, structure, or Partner Skill calculation is implemented.                                                                                                                |
| Ancient Hatchery rare-skill modifier                         | Qualitatively stated but not quantified. [3] [4] [7]                                                                                                                                                                 | wiki             | **No.**                                                                                                                                                                    | **UNKNOWN** numeric rule; controlled protocol below.                                                                                                                                                  |
| Hatched-Pal realization from a duplicated mutated egg        | Wiki/community evidence says the same mutated species may be duplicated with a different passive roll; reports conflict on full IV/passive identity. [5] [20] [21]                                                   | wiki / community | **No.**                                                                                                                                                                    | Do not encode a deterministic duplication rule.                                                                                                                                                       |

### App code facts behind the coverage column

The current resolver selects a unique override before same-species breeding and otherwise computes `floor((parentA.combiRank + parentB.combiRank + 1) / 2)`, then resolves the closest eligible child with priority, variant, and index tie-breakers. It also guards unacquirable self-only loops. The model stores only desired-passive masks and total passive counts for route cost; it does not represent an egg object, egg pickup, facility type, cake, temperature, Alpha state, mutation, IVs, active skills, or a Partner Skill level. This is intentional present-state documentation, not a recommendation to model every omitted mechanic.

## 1.3 Bred egg-size variation

The app’s current one-size-per-species representation is incomplete for all breeding outcomes. The current Palworld Wiki states that a bred Pal has a 5% Alpha chance independent of its parents and that an Alpha egg is one size larger than the species’ default egg. Broncherry and Broncherry Aqua can separately add Alpha state when an egg is manually picked up. [5] [8] [9] [10] [11]

Pocketpair’s v1.0 changelog separately records a bug fix for breeding-farm eggs that gradually became larger or smaller after repeated production and collection. That confirms historic visual-size drift existed, but it does **not** publish the intended Alpha-size mapping. [1]

| Question                                                                  | Reference conclusion                                                                                                               | Source tier | Date checked |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| Can a bred egg differ from the species’ default size?                     | **Yes, at wiki tier:** an Alpha egg is reported one size larger. [5]                                                               | wiki        | 2026-08-20   |
| Does a parent’s Alpha state cause it?                                     | **No, according to the current Wiki:** the reported 5% Alpha chance is independent of the parents. [5]                             | wiki        | 2026-08-20   |
| Can a Partner Skill produce the Alpha change after lay?                   | **Yes:** Broncherry and Broncherry Aqua descriptions say the manually picked-up egg can become an Alpha Pal Egg. [8] [9] [10] [11] | wiki        | 2026-08-20   |
| Does condensation, cake, or a parent-driven effect otherwise change size? | **UNKNOWN.** No reliable source located in this pass.                                                                              | —           | 2026-08-20   |
| What happens when the default egg is already Huge?                        | **UNKNOWN.** Do not invent a fourth size or silently clamp the claim.                                                              | —           | 2026-08-20   |
| Do Small or Medium bred-egg size labels exist?                            | **No evidence found.** The validated incubation reference uses Normal, Large, and Huge. [6]                                        | wiki        | 2026-08-20   |

The proper application-facing conclusion is: `eggSize` is a **default display attribute**, not a guarantee of the size of every bred egg. This document records a discrepancy only; it does not change `pals.ts` or user interface copy.

## 1.4 Egg types on bred eggs

The current Egg Incubator reference lists nine elemental/base egg varieties: **Common, Rocky, Verdant, Damp, Electric, Dragon, Frozen, Dark, and Scorching**. It says each is associated with the matching Pal type and that eggs can be Large or Huge; Game8 separately lists **Mutated Egg** and **Ominous Egg** in its general egg list. [6] [16]

| Category                                                | Exact strings observed                                                                    | Source tier                                                                          | Scope                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Base / elemental egg varieties                          | `Common`, `Rocky`, `Verdant`, `Damp`, `Electric`, `Dragon`, `Frozen`, `Dark`, `Scorching` | wiki [6]                                                                             | Eggs generally, including the reference’s statement that breeding produces Pal Eggs. |
| Special egg labels                                      | `Mutated Egg`, `Ominous Egg`                                                              | community [16]                                                                       | General egg guide; not a verified per-species bred-egg mapping.                      |
| Current app data                                        | `Common` for every one of 300 current records                                             | repository                                                                           | Static data currently shown by the UI.                                               |
| Exact elemental egg type for each possible bred species | **UNKNOWN.**                                                                              | No source table was found that establishes a complete, bred-output-specific mapping. | Do not replace the current field with inferred element aliases.                      |

The safe conclusion is **not** that bred eggs are all Common, nor that the general wild-egg type table automatically maps to every bred result. The document proves the all-Common field is not a complete representation of game egg labels, but a complete per-bred-child mapping requires a source that actually records it.

## 1.5 Hatch time

Hatch time is not a meaningful fixed per-species property. The Egg Incubator reference makes incubation duration depend on egg size, comfort/temperature, and world settings; the standard incubator relies on environmental temperature. The table below records the cited base table, before server/world scaling and other modifiers. [6]

| Egg size | Slightly cold / hot (0%) | Very comfortable (50%) | Optimal (100%) | Source tier |
| -------- | -----------------------: | ---------------------: | -------------: | ----------- |
| Normal   |                  6:00:00 |                4:00:00 |        3:00:00 | wiki [6]    |
| Large    |                 36:00:00 |               24:00:00 |       18:00:00 | wiki [6]    |
| Huge     |                 72:00:00 |               48:00:00 |       36:00:00 | wiki [6]    |

The same source presents the relationship as base time divided by incubation-speed factor (`×1.0`, `×1.5`, or `×2.0`). Its egg-type comfort guidance is listed below. [6]

| Comfort group | Egg types                 |
| ------------- | ------------------------- |
| Cold          | Damp, Frozen, Dark        |
| Moderate      | Common, Verdant, Electric |
| Hot           | Scorching, Rocky, Dragon  |

The official v1.0 changelog also says new Normal and Hard worlds receive halved egg-incubation time. The Ancient Hatchery advertises `+100%` incubation speed, and Dynamoff’s Partner Skill reduces incubation time by 20 / 22 / 26 / 32 / 40% across Levels 1–5. [1] [4] [17]

The app currently presents default-server-style size ranges (`Normal 3–6h`, `Large 18–36h`, `Huge 36–72h`) as an estimate. It does not calculate world-setting multipliers, heat/cold comfort, facility effects, or Dynamoff. Those display values should therefore continue to be understood as an estimate, not an exact personal-server forecast.

## 1.6 Egg-affecting Partner Skills and Pal Gear

The five verified Partner Skills below are **not inherited Passive Skills**. They are Pal-specific Partner Skills enabled by their corresponding Pal Gear, generally a saddle. Values are provided here in prose/table form and in the sibling machine-readable file `docs/palworld-1.0-partner-skill-breeding-effects.json`.

| Pal             | Partner Skill              | Gear                   |   L1 |   L2 |   L3 |   L4 |   L5 | Pipeline effect                                                 | Stacking / boundary                                                                | Source tier    |
| --------------- | -------------------------- | ---------------------- | ---: | ---: | ---: | ---: | ---: | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------- |
| Broncherry      | Love’s First Blossom       | Broncherry Saddle      |  35% |  37% |  39% |  41% |  45% | Manually picked-up Pal Egg becomes an Alpha Pal Egg.            | Does not stack; no source says it rerolls species, mutation, passives, or element. | wiki [8] [9]   |
| Broncherry Aqua | Purity’s Full Bloom        | Broncherry Aqua Saddle |  45% |  47% |  49% |  51% |  55% | Manually picked-up Pal Egg becomes an Alpha Pal Egg.            | No source says it rerolls species, mutation, passives, or element.                 | wiki [10] [11] |
| Grintale        | Glaring Cat’s Eye          | Grintale Saddle        |  50% |  55% |  60% |  65% |  75% | Manually picking up a Pal Egg awards one extra egg on success.  | Does not stack; complete duplicate-roll behavior is not public.                    | wiki [12] [13] |
| Braloha         | Balmy Weather              | Braloha Saddle         | +20% | +26% | +32% | +38% | +50% | Increases Breeding Farm egg-production speed for assigned Pals. | Does not stack; affects throughput, not a declared per-egg outcome.                | wiki [14] [15] |
| Dynamoff        | Electro-Massage Incubation | Dynamoff Saddle        | −20% | −22% | −26% | −32% | −40% | Reduces incubation time.                                        | Does not stack; no stated effect on hatched-Pal attributes.                        | wiki [17]      |

### Alpha conversion is real, but narrow

Broncherry and Broncherry Aqua supply the missing post-lay mechanic. Their cited descriptions state **Alpha conversion** at manual egg pickup. The correct reference language is therefore:

> **Alpha state can be added at manual pickup by a Pal-Gear Partner Skill.** No current reliable description says these skills reroll species, passive selection, active skills, egg element, or mutation selection.

### Mutated eggs and Grintale

Pocketpair officially describes mutation as a low-chance breeding outcome producing a stronger Pal with higher stats and a unique passive. The current Wiki adds a 1% base / 3% Extravagant Vegetable Cake rate, Alpha status, and high-stat/passive properties; those additional values are **wiki tier**, not official. [1] [5]

The Wiki and a dedicated player test say that Grintale duplication of a mutated egg produces the same mutated species but can yield different passive rolls. Some Steam Community reports describe egg duplicates as identical and disagree on the mutated case. This must stay a **community/wiki note**, never a deterministic app rule. [5] [20] [21]

No reliable source found in this review supports the stronger proposition that Broncherry conversion changes a mutated egg’s species outcome beyond Alpha conversion. Because the current Wiki already describes mutated eggs as Alpha, any additional Broncherry–mutation effect is **UNKNOWN** until tested or extracted.

### Keep ordinary passive skills separate

The PalCalc-derived passive catalogue has two ordinary Passive Skills with direct breeding-time text:

| Passive                                         | Effect                                                                                         | Effect category         | Source tier   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Philanthropist (`Test_PalEgg_HatchingSpeed_Up`) | Breeding speed increased by 100% when assigned to a Breeding Farm.                             | Throughput              | datamined [2] |
| Babysitter (`MutationPal_Babysitter`)           | At a base, egg production speed +30% and incubation +30% for Pals assigned to a Breeding Farm. | Throughput / incubation | datamined [2] |

These are not Partner Skills, and their extracted text does not claim an Alpha, size, species, or mutation-selection effect. PalCalc’s non-inheritable `EggAlphaConversion_*` markers are internal conversion records, not player-owned passives. [2]

---

# §4 — Consolidated mechanics relevant to Priority §1

## Confirmed ingredients and stated cake effects

Pocketpair’s official v1.0 release changelog states the following new cake effects: Mushroom Cake slightly increases the likelihood of higher stats; Vegetable Cake produces two eggs at once; Deluxe Vegetable Cake increases mutation likelihood and stat growth; Special Cake increases the chance of inheriting multiple passive skills. [1]

Current sources do not agree on every label and exact numeric rule. Game8 uses the in-game-looking label **Extravagant Vegetable Cake** and describes it as making mutations more likely and talents more likely to grow. The reference uses the exact source wording in each citation and does not collapse “Deluxe” and “Extravagant” into a claimed proven synonym without a raw localized-item extraction. [1] [16]

## Passive inheritance and expected eggs

The public PalCalc data exposes `PassiveInheritanceWeights` of 1:4, 2:3, 3:2, 4:1, corresponding to 40 / 30 / 20 / 10 percent. The app matches this inherited-count distribution. However, the same accessible evidence does not publish the identity-selection rules for random passives, duplicate behavior in all intermediate states, or a complete distribution over later children. The pathfinder’s expected egg total is therefore an **approximation with no universal directional guarantee**, not a lower bound. [2]

The Ancient Hatchery’s claimed rare-skill modifier is an additional unmodeled condition. Do not combine it with the pathfinder’s ordinary-passive calculation without new evidence.

---

# §11 — Current application model, as of this document

This table is intentionally concise. It helps future sessions distinguish a documented model gap from a missing implementation claim.

| App surface                                | Current behavior                                                                                                                     | Deliberate limitation relevant here                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Breeding pathfinder                        | Finds chains through generated unique-combination and formula resolution; optimizes expected egg count for selected passive sources. | Does not simulate mutation, Alpha, egg pickup, Partner Skills, IVs, active skills, cake, incubator, or individual egg outcomes. |
| Egg data and result panels                 | Shows `eggType`, default `eggSize`, and a size-driven incubation estimate.                                                           | `eggType` is all `Common`; size does not reflect Alpha variation; timing does not reflect user world settings or facilities.    |
| Collection                                 | Stores Pal, gender, and passive IDs.                                                                                                 | Does not store Partner Skill rank/Gear, Alpha, mutation, IVs, cake, facility, or egg state.                                     |
| Data-check                                 | Audits the generated source data shape and acquisitions.                                                                             | It does not validate in-game breeding runtime mechanics absent from public source data.                                         |
| PWA, explorer, reverse lookup, share links | Implemented separately and outside this document’s evidence focus.                                                                   | No implication that these surfaces simulate the pipeline above.                                                                 |

---

# Discrepancy log

| Topic                                    | Conflict or limitation                                                                                                                  | Reference decision                                                             | Why                                                                                   | What would resolve it                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Ancient structure name                   | Guides call it “Ancient Breeding Facility”; Wiki/Game8 use “Ancient Hatchery.” [3] [7] [19]                                             | Use **Ancient Hatchery**.                                                      | It is the named Technology on the current structured pages.                           | Raw localized-item extraction or in-game screenshot, if ever needed.      |
| Ancient Hatchery rare-skill bonus        | Multiple pages repeat the qualitative effect but give no numbers, target set, selection order, or Special Cake interaction. [3] [4] [7] | Include only the qualitative effect; numeric rule is **UNKNOWN**.              | A repeated claim is not a parameter table.                                            | `DA_BreedingItemEffectData` extraction or controlled test protocol below. |
| Mutated egg Alpha status                 | Wiki says always Alpha; Palpedia says potentially Alpha. [5] [22]                                                                       | Working conclusion: **always Alpha at wiki tier**, with the conflict retained. | Wiki outranks community under project policy; neither is a disclosed code extraction. | Game-code extraction of mutation result flags.                            |
| Grintale duplicated mutated eggs         | Wiki/player test report same species with different passive rolls; some Steam reports call duplicates identical. [5] [20] [21]          | Community/wiki note only; no quantitative rule.                                | The reports conflict and no raw logic is public.                                      | Controlled paired test with complete egg and offspring records.           |
| Broncherry interaction with mutated eggs | Skill descriptions only name Alpha conversion. [8] [10]                                                                                 | **UNKNOWN** beyond stated Alpha conversion.                                    | No source says it alters mutation species or passives.                                | Controlled test protocol below or game-code extraction.                   |
| Alpha egg-size upper boundary            | Wiki says one size larger; no source confirms Huge-default behavior or a fourth named size. [5]                                         | **UNKNOWN** at the upper bound.                                                | Do not extrapolate a visual rule.                                                     | Egg-rank data table or controlled visual/metadata test.                   |
| “All bred eggs are Common”               | Application data says Common for all rows; incubator page lists nine base egg varieties. [6]                                            | Treat application field as incomplete, not a verified game rule.               | General type list is not a per-bred-output mapping.                                   | Extracted or officially documented bred-child egg-type map.               |
| Fixed per-species hatch time             | App display has size-only ranges; Wiki uses size, comfort, settings. [6]                                                                | Treat UI output as estimate.                                                   | Per-species time is not the documented rule.                                          | World-setting/incubator formula extraction.                               |

---

# Gaps and controlled-test protocols

The two protocols below are designed for **Kevin or another player** to collect usable evidence without spending time on an unstructured anecdote. They are not requests to alter saves, use mods, or use premium currency. Store raw observations in CSV/JSON and preserve screenshots or short video at setup, egg collection, and hatch.

## Protocol A — Ancient Hatchery rare-skill inheritance modifier

**Question.** What does “increases the inheritance rate of rare skills” change: an existing egg’s hatch result, the full Ancient-Hatchery production route, or neither? Which parent passives/ranks are affected, by how much, and does the effect overlap with Special Cake?

### Experimental design

| Design item                     | Required procedure                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parent controls                 | Create **matched male/female pairs** of the same species, gender arrangement, condensation rank, level, stat potentials, and passive layout. Use parents with a short, explicitly recorded passive list; do not invent a “rare” rank definition before results are collected.                                           |
| Cake and Partner-Skill controls | Use the same cake type in all arms, beginning with ordinary Cake. Keep Broncherry, Broncherry Aqua, Grintale, Braloha, Dynamoff, Babysitter, and Philanthropist absent or identically controlled across arms. Record their absence/presence.                                                                            |
| Arms                            | **A:** regular Breeding Farm → regular incubator. **B:** regular Breeding Farm → Ancient Hatchery incubation, if the current UI accepts the manually produced egg. **C:** full Ancient Hatchery breeding and hatch. This separates an incubation-stage effect from a full-facility production effect.                   |
| Sample size                     | **Minimum: 1,000 normally hatched, non-mutated offspring per arm.** Record mutations and Alpha separately rather than silently dropping them. This is a screening sample; a smaller effect or a passive-specific effect needs a larger follow-up sample.                                                                |
| Primary records                 | One row per egg: test arm; world/server settings; date/version; parent IDs/species/gender/levels/condensation/passives; cake; facility; egg size/type/Alpha/mutation state if visible; hatch result species; all passive names/ranks; IV/stat-potential values if visible; active skills; screenshots/video identifier. |
| Primary comparison              | Compare (1) probability of each parent passive appearing, (2) number of inherited parent passives, (3) rank distribution of parent-origin passives, and (4) random-passive occurrence. Analyse mutations and Alpha as strata, not as discarded observations.                                                            |

A result counts as an answer only if the Ancient condition’s pre-registered comparison differs from the matched regular-farm control and the effect repeats in a fresh run. A result of “no visible difference” is not proof of no effect unless the observed confidence interval is reported; it only bounds the effect at the tested sample size. If a difference appears, repeat with Special Cake as a separate, controlled factor—**do not** merge cake and facility changes in the first experiment.

## Protocol B — Broncherry interaction with mutated eggs beyond Alpha conversion

**Question.** When a mutated egg is manually picked up with a max-rank Broncherry / Broncherry Aqua Partner Skill active, does anything change beyond the skill’s stated Alpha conversion—for example, mutated child species, mutation-exclusive passive, passive array, IVs, or egg size?

### Experimental design

| Design item                  | Required procedure                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parent and breeding controls | Use the same fixed male/female parent species, gender arrangement, levels, condensation, passive arrays, and base. Use **Extravagant Vegetable Cake** consistently to enrich for mutations, but record the exact in-game cake name and game version.                                              |
| Arms                         | **Control:** no Broncherry or Broncherry Aqua in party when each egg is manually picked up. **Treatment:** one equipped, maximum-rank Broncherry or Broncherry Aqua in party when each egg is manually picked up. Do not mix the two skills in an arm.                                            |
| Sample size                  | **Minimum: 100 mutated eggs per arm**, with the total ordinary eggs produced and all non-mutated eggs logged. Mutation is rare, so report the raw denominator; do not report only successful mutated cases. If resources permit, repeat for both Broncherry variants.                             |
| Pickup evidence              | Before collection, capture the egg’s visual size/appearance and a unique sequence number. Immediately after collection, preserve any game-visible Alpha/egg indicator. Never rely on memory for whether the Partner Skill was active.                                                             |
| Hatch records                | Record final species, Alpha flag, egg size/type, all passives and ranks, IV/stat potentials if visible, condensation level, and whether the outcome is a mutation-exclusive passive. Keep screenshots/video IDs.                                                                                  |
| Comparison                   | Compare species distributions, mutation-exclusive passive rates, full passive arrays, IV/potential distributions, and egg-size/Alpha indicators across control and treatment. The documented Alpha conversion is expected; the test is for an **additional** difference after controlling for it. |

A result counts as an answer if the treatment produces a reproducible non-Alpha difference in an explicitly recorded field that is absent in the control, with raw counts and media. If the two arms have no non-Alpha differences at the tested sample size, report that narrowly as **“no interaction observed in this protocol”**—not as proof that no hidden interaction exists. The evidence must remain separate from the known Alpha conversion.

---

# References

[1]: https://steamcommunity.com/games/1623730/announcements/detail/686383649529010624 "Pocketpair — Palworld v1.0 Official Release Changelog"
[2]: https://github.com/tylercamp/palcalc/blob/master/PalCalc.Model/db.json "PalCalc — Game-derived database"
[3]: https://palworld.wiki.gg/wiki/Ancient_Hatchery "Palworld Wiki — Ancient Hatchery"
[4]: https://paldb.cc/en/Ancient_Hatchery "PalDB — Ancient Hatchery"
[5]: https://palworld.wiki.gg/wiki/Breeding "Palworld Wiki — Breeding"
[6]: https://palworld.wiki.gg/wiki/Egg_Incubator "Palworld Wiki — Egg Incubator"
[7]: https://game8.co/games/Palworld/archives/610225 "Game8 — How to Get Ancient Hatchery"
[8]: https://game8.co/games/Palworld/archives/442554 "Game8 — Love’s First Blossom Partner Skill"
[9]: https://paldb.cc/en/Broncherry "PalDB — Broncherry / Love’s First Blossom"
[10]: https://game8.co/games/Palworld/archives/610025 "Game8 — Purity’s Full Bloom Partner Skill"
[11]: https://paldb.cc/en/Broncherry_Aqua "PalDB — Broncherry Aqua / Purity’s Full Bloom"
[12]: https://game8.co/games/Palworld/archives/442622 "Game8 — Glaring Cat’s Eye Partner Skill"
[13]: https://paldb.cc/en/Grintale "PalDB — Grintale / Glaring Cat’s Eye"
[14]: https://game8.co/games/Palworld/archives/532274 "Game8 — Balmy Weather Partner Skill"
[15]: https://paldb.cc/en/Braloha "PalDB — Braloha / Balmy Weather"
[16]: https://game8.co/games/Palworld/archives/611487 "Game8 — Palworld 1.0 Breeding Guide"
[17]: https://paldb.cc/en/Dynamoff "PalDB — Dynamoff / Electro-Massage Incubation"
[18]: https://www.bisecthosting.com/blog/palworld-mutated-eggs-cakes-breeding-passive-skills-babysitter-immortality-skymarcher "BisectHosting — Mutated Eggs Guide"
[19]: https://www.4netplayers.com/en/blog/palworld/palworld-1-0-breeding-guide-mutations-cakes-ancient-breeding-facility/ "4Netplayers — Palworld 1.0 Breeding Guide"
[20]: https://www.reddit.com/r/Palworld/comments/1uztdxs/grintale_can_duplicate_breeding_eggs_and_mutation/ "Community test — Grintale duplication and mutation eggs"
[21]: https://steamcommunity.com/app/1623730/discussions/0/592936492464274864/ "Steam Community — Mutated eggs discussion"
[22]: https://palpedia.net/breeding/mutations "Palpedia — Mutation Calculator and mechanics"
