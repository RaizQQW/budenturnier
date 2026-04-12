import { cardNameKey } from "./parseDecklist";
import type { CardCacheFile, DeckWithCards } from "./types";

type DeckArchetypeInput = Pick<DeckWithCards, "oracleQty" | "archetype">;

/** Mainboard qty by normalized card name (front face of DFCs). */
function mainNameQty(
  deck: DeckArchetypeInput,
  cache: CardCacheFile,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const [oid, q] of Object.entries(deck.oracleQty)) {
    const c = cache.cards[oid];
    if (!c) continue;
    const base = c.name.split("//")[0]?.trim() ?? c.name;
    const k = cardNameKey(base);
    m.set(k, (m.get(k) ?? 0) + q.main);
  }
  return m;
}

function qty(m: Map<string, number>, ...englishNames: string[]): number {
  let s = 0;
  for (const n of englishNames) {
    s += m.get(cardNameKey(n)) ?? 0;
  }
  return s;
}

/** Merge obvious manual-tag synonyms when card rules do not classify. */
function harmonizeManualTag(archetype: string | null): string | null {
  if (!archetype?.trim()) return null;
  const t = archetype.trim();
  const lower = t.toLowerCase();
  const map: Record<string, string> = {
    vampires: "Rakdos Vampires",
    "rakdos vampires": "Rakdos Vampires",
    "5c humans toolbox": "Naya Humans",
    "naya humans": "Naya Humans",
    "naya humans (toolbox)": "Naya Humans",
    "boros humans": "Boros Humans",
    "boros aggro": "Boros Humans",
    "selesnya humans": "Selesnya Humans",
    "monowhite midrange": "Mono-White Humans",
    "bg sacrifice midrange": "BG Sacrifice",
  };
  return map[lower] ?? t;
}

/**
 * Final harmonized label: explicit `decks.json` override wins, else inference.
 */
export function resolveHarmonizedArchetype(
  jsonOverride: string | null | undefined,
  deck: DeckArchetypeInput,
  cache: CardCacheFile,
): string | null {
  const o = jsonOverride?.trim();
  if (o) return o;
  return harmonizedArchetypeForDeck(deck, cache);
}

/**
 * Coarse archetype from mainboard signatures (cache-backed names).
 * Falls back to a harmonized manual tag when no rule matches.
 */
export function harmonizedArchetypeForDeck(
  deck: DeckArchetypeInput,
  cache: CardCacheFile,
): string | null {
  if (Object.keys(deck.oracleQty).length === 0) {
    return harmonizeManualTag(deck.archetype);
  }

  const m = mainNameQty(deck, cache);
  const mountain = qty(m, "Mountain");
  const forest = qty(m, "Forest");
  const plains = qty(m, "Plains");

  const hasChampion = qty(m, "Champion of the Parish") >= 1;
  const hasChord = qty(m, "Chord of Calling") >= 1;

  // 1 — UW Control
  if (
    qty(m, "Deserted Beach") >= 3 ||
    (qty(m, "Dream Strix") >= 2 && qty(m, "Vanquish the Horde") >= 2) ||
    (qty(m, "Faithbound Judge") >= 2 && qty(m, "Think Twice") >= 2)
  ) {
    return "UW Control";
  }

  // 2 — Izzet Ensoul
  if (
    qty(m, "Ensoul Artifact") >= 1 ||
    qty(m, "Serpentine Ambush") >= 2 ||
    (qty(m, "Ornithopter") >= 2 && qty(m, "Shrapnel Blast") >= 2)
  ) {
    return "Izzet Ensoul";
  }

  // 3 — Izzet Control / spells
  if (
    qty(m, "Thing in the Ice") >= 1 ||
    qty(m, "Divide by Zero") >= 2 ||
    (qty(m, "Prismari Command") >= 3 && qty(m, "Consider") >= 2)
  ) {
    return "Izzet Control";
  }

  // 4 — Naya (WRG) Chord humans toolbox — not 5c (no blue/black core)
  if (hasChord) {
    return "Naya Humans";
  }

  // 5 — Abzan Control (Esper-less wedge control)
  if (
    qty(m, "Vanquish the Horde") >= 3 &&
    qty(m, "Shattered Sanctum") >= 2 &&
    (qty(m, "Woodland Cemetery") >= 2 || qty(m, "Overgrown Farmland") >= 2)
  ) {
    return "Abzan Control";
  }

  // 6 — Orzhov mid (WB mid / vampires hybrid, not Abzan sweep)
  if (
    qty(m, "Shattered Sanctum") >= 2 &&
    (qty(m, "Sorin the Mirthless") >= 1 ||
      qty(m, "Sorin, Grim Nemesis") >= 1 ||
      qty(m, "Sorin, Solemn Visitor") >= 1) &&
    qty(m, "Vanquish the Horde") < 2
  ) {
    return "Orzhov Midrange";
  }

  // 7 — Humans shells
  if (hasChampion) {
    if (
      qty(m, "Katilda, Dawnhart Prime") >= 1 ||
      qty(m, "Torens, Fist of the Angels") >= 1 ||
      (forest >= 5 && mountain === 0)
    ) {
      return "Selesnya Humans";
    }
    if (mountain >= 2 && plains < 16) {
      return "Boros Humans";
    }
    if (plains >= 14 && mountain <= 1) {
      return "Mono-White Humans";
    }
  }

  // 8 — Rakdos / BR Vampires
  if (
    (qty(m, "Haunted Ridge") >= 2 || qty(m, "Foreboding Ruins") >= 2) &&
    (qty(m, "Vampire Socialite") >= 2 ||
      qty(m, "Voldaren Epicure") >= 2 ||
      qty(m, "Bloodthirsty Adversary") >= 2 ||
      qty(m, "Falkenrath Gorger") >= 2 ||
      qty(m, "Henrika Domnathi") >= 1)
  ) {
    return "Rakdos Vampires";
  }

  // 9 — BG Pests / Witherbloom tokens
  if (
    qty(m, "Sedgemoor Witch") >= 3 ||
    (qty(m, "Sedgemoor Witch") >= 2 && qty(m, "Hunt for Specimens") >= 2)
  ) {
    return "BG Pests";
  }

  // 10 — BG Graveyard / Delirium
  if (
    qty(m, "Old Stickfingers") >= 1 ||
    qty(m, "Grisly Salvage") >= 2 ||
    qty(m, "Eccentric Farmer") >= 2 ||
    qty(m, "Deathbonnet Sprout") >= 2
  ) {
    return "BG Graveyard";
  }

  // 11 — BG sacrifice / Daemogoth
  if (qty(m, "Daemogoth Titan") >= 2 || qty(m, "Tend the Pests") >= 3) {
    return "BG Sacrifice";
  }

  // 12 — BG stompy mid
  if (qty(m, "Cemetery Prowler") >= 3 || qty(m, "Primal Adversary") >= 3) {
    return "BG Midrange";
  }

  return harmonizeManualTag(deck.archetype);
}
