import type { DeckListParsed, ParsedDeckLine } from "./types";

/**
 * Mainboard: `~~Mainboard~~`, `Mainboard`, `Mainboard:`, `~~Decklist~~`, etc.
 * Sideboard: `~~Sideboard~~`, `Sideboard`, `SIDEBOARD:`, …
 */
const MAIN =
  /^\s*(?:~~\s*)?(?:mainboard|decklist)(?:\s*~~)?\s*:?\s*$/i;
const SIDE = /^\s*(?:~~\s*)?sideboard(?:\s*~~)?\s*:?\s*$/i;

/** MTGO-style: optional leading BOM, digits + space + rest of line */
const QTY_NAME = /^\s*(?:\uFEFF)?(\d+)\s+(.+?)\s*$/;

/** Strip `(SET) 123`, foil `*F*`, etc., and normalize ` / ` MDFC separators for Scryfall. */
export function normalizeDeckCardName(raw: string): string {
  let s = raw.trim().replace(/\s+\/\s+/g, " // ");
  for (let i = 0; i < 5; i++) {
    const next = s
      .replace(/\s*\*[^*]+\*\s*$/i, "")
      .replace(/\s*\([A-Z0-9]{2,5}(?:-[A-Z0-9]+)?\)\s*\d+\s*$/i, "")
      .trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * Parses Budenturnier export (~~Mainboard~~ / ~~Sideboard~~) and plain qty+name lines.
 */
export function parseDecklist(text: string): DeckListParsed {
  let board: "main" | "side" = "main";
  const lines: ParsedDeckLine[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (MAIN.test(line)) {
      board = "main";
      continue;
    }
    if (SIDE.test(line)) {
      board = "side";
      continue;
    }
    const m = line.match(QTY_NAME);
    if (!m) continue;
    const qty = Number(m[1]);
    const name = normalizeDeckCardName(m[2]);
    if (!name || !Number.isFinite(qty) || qty < 1) continue;
    lines.push({ name, qty, board });
  }

  return { lines };
}

export function cardNameKey(name: string): string {
  return name.toLowerCase().trim();
}
