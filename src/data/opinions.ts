// Part 7 — COMMUNITY OPINION. Hand-curated, verbatim, cited.
//
// Rules this file obeys, deliberately:
//  - Nothing here feeds a computed score. Opinion never blends into /tiers.
//  - Every card carries a source name, URL, date and a VERBATIM quote of the
//    reasoning. No paraphrase is presented as a source's words.
//  - Where sources disagree, both sides are kept and shown together. The
//    disagreement is the signal; it is never averaged into a consensus.
//  - Undated or clearly pre-Feybreak material is flagged "may be outdated".
//  - No creator's ranking was inferred from a video title. Nothing was extracted
//    from a page that returned a challenge/interstitial instead of content.
//  - Thin and honest beats padded: this is a handful of well-cited cards, not
//    exhaustive coverage.

export interface OpinionSource {
  name: string;
  url: string;
  /** ISO date as published/updated by the source. null when the source is undated. */
  date: string | null;
  /** Verbatim, unedited. Ellipses only where text was cut, never reworded. */
  quote: string;
}

export interface OpinionCard {
  id: string;
  topic: "raid" | "combat" | "base" | "quirk";
  title: string;
  /** Our own framing of what the card is about — never presented as a quote. */
  context: string;
  sources: OpinionSource[];
  /** Two or more sources reaching different conclusions on the same question. */
  disagreement?: boolean;
}

/** Feybreak shipped Dec 2024; 1.0 landed 2025. Anything older is flagged. */
export const FEYBREAK_DATE = "2024-12-23";

export function mayBeOutdated(date: string | null): boolean {
  return date === null || date < FEYBREAK_DATE;
}

export const OPINION_CARDS: OpinionCard[] = [
  {
    id: "raid-aggro-shift",
    topic: "raid",
    title: "Raid aggro changed what a raid army is for",
    context:
      "Raid bosses now chase damage rather than proximity, which moved raid-army selection away from survivability.",
    sources: [
      {
        name: "The Pal Professor — Raid Army Tierlist",
        url: "https://thepalprofessor.com/raid-army-tierlist/",
        date: "2026-03-01",
        quote:
          "Aggro mechanics changed in v0.7.1. Raid Bosses now target the Pal or Player dealing the most damage. With this change the priority for raid armies shifted from surviving to dealing damage.",
      },
      {
        name: "The Pal Professor — Raid Bosses",
        url: "https://thepalprofessor.com/raid-bosses/",
        date: "2026-02-08",
        quote:
          "Since the rescue strategy got patched out the most effective tactic is to maximise Player & Party damage to draw aggro. With good positioning far away from the raid army the raid army pals no longer take damage.",
      },
    ],
  },
  {
    id: "raid-element-choice",
    topic: "raid",
    title: "Don't bring Ice or Electric to Xenolord and Hartalis",
    context:
      "A specific, non-obvious build constraint that no stat table can tell you: the stun you want to save is spent by filler attacks.",
    sources: [
      {
        name: "The Pal Professor — Raid Army Tierlist",
        url: "https://thepalprofessor.com/raid-army-tierlist/",
        date: "2026-03-01",
        quote:
          "You get 1 chance to apply an aggregate to Xenolord/Hartalis. It is recommended to not use Ice or Electric attacks in the raid army to ensure you can stun at key moments (Cosmic Meteor).",
      },
    ],
  },
  {
    id: "quirk-mounted-combat",
    topic: "quirk",
    title: "Mounted-combat bugs are demoting otherwise strong Pals",
    context:
      "A case where the numbers say one thing and the game does another — exactly the sort of thing the computed tier lists on this site cannot see.",
    sources: [
      {
        name: "The Pal Professor — End Game Combat Tierlist",
        url: "https://thepalprofessor.com/end-game-combat-tierlist/",
        date: "2026-03-01",
        quote:
          "There are a few bugs related to mounted combat causing pals to forget attacks. Pals that rely on Saddles for the Partner Skill and Mounting/Dismounting during combat have been shifted down",
      },
    ],
  },
  {
    id: "raid-difficulty-order",
    topic: "raid",
    title: "One raid army clears them all",
    context: "Community consensus on whether raid loadouts need per-boss tuning.",
    sources: [
      {
        name: "The Pal Professor — Palworld Tierlist",
        url: "https://thepalprofessor.com/pal-tierlist/",
        date: "2024-11-26",
        quote:
          "Xenolord is level 60, Blazamut Ryu level 55 and Bellanoir Libero level 50. Any setup of Party and Base Pals that can handle Xenolord can handle the other bosses.",
      },
      {
        name: "Dot Esports — Xenolord guide",
        url: "https://dotesports.com/palworld/news/xenolord-guide-how-to-beat-palworld-raid",
        date: "2024-12-25",
        quote:
          "Palworld has no shortage of difficult endgame content, but the new raid boss added in the Feybreak update is the most difficult to date.",
      },
    ],
  },
  {
    id: "base-transporting-disagreement",
    topic: "base",
    title: "Best transporter: highest level, or fastest legs?",
    context:
      "A real split. Suitability level is what this site's Base/Work tier list scores; several guides argue movement speed matters as much for transporting specifically.",
    disagreement: true,
    sources: [
      {
        name: "Mobalytics — Best Transporting Pals in Palworld 1.0",
        url: "https://mobalytics.gg/gamebase/guides/palworld-best-transporting-pals",
        date: "2026-07-24",
        quote:
          "Eidrolon (and Eidrolon Ignis) is the best Transporting pal not due to its raw numbers, having a base Transporting level of 6, but because it is also incredibly fast - 1400 movespeed to be precise, which sets it as one of the fastest Pals in the game.",
      },
      {
        name: "Palworld Wiki (Fextralife) — Best Transporting Pals",
        url: "https://palworld.wiki.fextralife.com/Best_Transporting_Pals",
        date: "2026-07-17",
        quote:
          "140 Pals can do Transporting work in Palworld — these are the ones that do it fastest, ranked by their Transporting Work Suitability level in the 1.0 data. ... Best overall Knocklem Ignis Lv 7",
      },
      {
        name: "allthings.how — Palworld 1.0 Best Base Pals for Every Work Type",
        url: "https://allthings.how/palworld-1-0-best-base-pals-for-every-work-type/",
        date: "2026-07-19",
        quote:
          "Quick answer: Assign the highest base Work Suitability Pal you own to each station. The current top picks are Renjishi (Kindling), Shaolong (Watering), Dandilord (Planting), Orserk (Electricity), Solenne (Handiwork), Jetragon (Gathering), Celesdir Noct (Lumbering), Aegidron (Mining), Silvance (Medicine Production), Bastigor (Cooling), Knocklem Ignis (Transporting), and any ranch Pal for Farming.",
      },
    ],
  },
  {
    id: "base-work-level-scaling",
    topic: "base",
    title: "Work levels are not linear — the top of the scale is worth far more",
    context:
      "Relevant to reading this site's Base/Work scores, which sum suitability levels linearly and therefore understate the gap at the top.",
    sources: [
      {
        name: "palworld.tools — Best transporting pals",
        url: "https://www.palworld.tools/work/transporting",
        date: null,
        quote:
          "The game assigns every transporting level a work power value (BP_PalGameSetting, rank 1 through the cap of 10). The jumps get steeper the higher you go, so one extra level near the top is worth more than several at the bottom. ... The highest innate level in 1.0 is 8; work passives and suitability-boosting consumables push a pal toward the cap of 10.",
      },
    ],
  },
];

/** Sources we could not read. Logged rather than guessed at. */
export const INACCESSIBLE_SOURCES: { name: string; url: string; reason: string }[] = [
  {
    name: "PC Gamer — The best Palworld Pals in 1.0",
    url: "https://www.pcgamer.com/games/survival-crafting/palworld-best-pals/",
    reason:
      "Page body returned membership/marketing boilerplate instead of guide content, so no ranking or reasoning could be quoted. Nothing was extracted.",
  },
  {
    name: "YouTube creator tier lists",
    url: "https://www.youtube.com/",
    reason:
      "No transcript was retrieved. A creator's ranking is never inferred from a video title, so nothing was extracted.",
  },
];
