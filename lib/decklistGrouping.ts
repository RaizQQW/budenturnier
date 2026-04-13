import { cardNameKey } from "@/lib/parseDecklist";
import type { ParsedDeckLine } from "@/lib/types";
import { firstFaceTypeLine, primaryTypeBucket, type DeckStatCardBucket } from "@/lib/cardTypeBucket";

/** MTGGoldfish-style sections (mainboard); Instants + Sorceries → Spells. */
export type DecklistDisplaySection =
  | "creatures"
  | "planeswalkers"
  | "spells"
  | "enchantments"
  | "artifacts"
  | "lands"
  | "other";

export const DECKLIST_DISPLAY_ORDER: readonly DecklistDisplaySection[] = [
  "creatures",
  "planeswalkers",
  "spells",
  "enchantments",
  "artifacts",
  "lands",
  "other",
] as const;

const SECTION_LABEL: Record<DecklistDisplaySection, string> = {
  creatures: "Creatures",
  planeswalkers: "Planeswalkers",
  spells: "Spells",
  enchantments: "Enchantments",
  artifacts: "Artifacts",
  lands: "Lands",
  other: "Other",
};

export function displaySectionLabel(section: DecklistDisplaySection): string {
  return SECTION_LABEL[section];
}

function bucketToDisplaySection(bucket: DeckStatCardBucket): DecklistDisplaySection {
  switch (bucket) {
    case "Land":
      return "lands";
    case "Creature":
      return "creatures";
    case "Planeswalker":
      return "planeswalkers";
    case "Instant":
    case "Sorcery":
      return "spells";
    case "Enchantment":
      return "enchantments";
    case "Artifact":
      return "artifacts";
    default:
      return "other";
  }
}

function typeLineForLine(
  line: ParsedDeckLine,
  resolvedOracleIds: Record<string, string>,
  oracleTypes: Record<string, string>,
): string {
  const oid = resolvedOracleIds[cardNameKey(line.name)];
  return oid != null ? (oracleTypes[oid] ?? "") : "";
}

function isBasicLandTypeLine(typeLine: string): boolean {
  return /\bBasic\b.*\bLand\b|\bBasic Land\b/i.test(firstFaceTypeLine(typeLine));
}

function totalQty(lines: ParsedDeckLine[]): number {
  return lines.reduce((s, l) => s + l.qty, 0);
}

function sortLinesInSection(
  section: DecklistDisplaySection,
  lines: ParsedDeckLine[],
  resolvedOracleIds: Record<string, string>,
  oracleTypes: Record<string, string>,
): ParsedDeckLine[] {
  const out = [...lines];
  if (section === "lands") {
    out.sort((a, b) => {
      const ta = typeLineForLine(a, resolvedOracleIds, oracleTypes);
      const tb = typeLineForLine(b, resolvedOracleIds, oracleTypes);
      const ba = isBasicLandTypeLine(ta);
      const bb = isBasicLandTypeLine(tb);
      if (ba !== bb) return ba ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  } else {
    out.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }
  return out;
}

/**
 * Groups mainboard lines by display section using Scryfall `type_line` (front face only via `primaryTypeBucket`).
 * Omits sections with zero cards.
 */
export function buildGroupedMainSections(
  lines: ParsedDeckLine[],
  resolvedOracleIds: Record<string, string>,
  oracleTypes: Record<string, string>,
): { section: DecklistDisplaySection; label: string; lines: ParsedDeckLine[]; count: number }[] {
  const bySection = new Map<DecklistDisplaySection, ParsedDeckLine[]>();
  for (const s of DECKLIST_DISPLAY_ORDER) bySection.set(s, []);

  for (const line of lines) {
    if (line.board !== "main") continue;
    const tl = typeLineForLine(line, resolvedOracleIds, oracleTypes);
    const sec = bucketToDisplaySection(primaryTypeBucket(tl));
    bySection.get(sec)!.push(line);
  }

  const result: {
    section: DecklistDisplaySection;
    label: string;
    lines: ParsedDeckLine[];
    count: number;
  }[] = [];

  for (const section of DECKLIST_DISPLAY_ORDER) {
    const raw = bySection.get(section)!;
    if (raw.length === 0) continue;
    const sorted = sortLinesInSection(section, raw, resolvedOracleIds, oracleTypes);
    result.push({
      section,
      label: displaySectionLabel(section),
      lines: sorted,
      count: totalQty(sorted),
    });
  }
  return result;
}
