import fs from "node:fs";
import path from "node:path";

import { cardNameKey, parseDecklist } from "./parseDecklist";
import type {
  CardCacheFile,
  DeckEntry,
  MatchRow,
  StandingRow,
  TournamentIndexFile,
  TournamentMeta,
} from "./types";

export type ValidationIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
  file?: string;
};

export type TournamentBundleData = {
  slug: string;
  dir: string;
  meta: TournamentMeta;
  standings: StandingRow[];
  decks: DeckEntry[];
  matches: MatchRow[];
  cardCache: CardCacheFile;
};

function push(
  issues: ValidationIssue[],
  level: ValidationIssue["level"],
  code: string,
  message: string,
  file?: string,
) {
  issues.push({ level, code, message, file });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseTournamentIndex(input: unknown): TournamentIndexFile {
  if (!isRecord(input) || !Array.isArray(input.tournaments)) {
    throw new Error("Invalid tournaments index: expected { tournaments: [] }");
  }

  const tournaments = input.tournaments.map((entry, i) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid tournaments index entry ${i + 1}: expected object`);
    }
    if (typeof entry.slug !== "string" || typeof entry.title !== "string" || typeof entry.date !== "string") {
      throw new Error(`Invalid tournaments index entry ${i + 1}: slug/title/date are required strings`);
    }
    if (entry.format != null && typeof entry.format !== "string") {
      throw new Error(`Invalid tournaments index entry ${entry.slug}: format must be a string`);
    }
    if (entry.playerCount != null && !isFiniteNumber(entry.playerCount)) {
      throw new Error(`Invalid tournaments index entry ${entry.slug}: playerCount must be a number`);
    }
    if (entry.decklistsWith != null && !isFiniteNumber(entry.decklistsWith)) {
      throw new Error(`Invalid tournaments index entry ${entry.slug}: decklistsWith must be a number`);
    }
    return {
      slug: entry.slug,
      title: entry.title,
      date: entry.date,
      format: entry.format as string | undefined,
      playerCount: entry.playerCount as number | undefined,
      decklistsWith: entry.decklistsWith as number | undefined,
    };
  });

  return { tournaments };
}

function buildNameToOracle(cardCache: CardCacheFile): Map<string, string> {
  const out = new Map<string, string>();
  for (const card of Object.values(cardCache.cards)) {
    const key = cardNameKey(card.name);
    out.set(key, card.oracle_id);
    if (card.name.includes("//")) {
      const front = card.name.split("//")[0]?.trim();
      if (front) out.set(cardNameKey(front), card.oracle_id);
    }
  }
  return out;
}

export function validateTournamentBundleData(
  bundle: TournamentBundleData,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { slug, dir, meta, standings, decks, matches, cardCache } = bundle;

  if (meta.slug !== slug) {
    push(
      issues,
      "error",
      "meta-slug-mismatch",
      `meta.slug is "${meta.slug}" but folder slug is "${slug}"`,
      path.join(dir, "meta.json"),
    );
  }

  if (meta.schemaVersion !== 1) {
    push(
      issues,
      "warn",
      "schema-version",
      `schemaVersion ${meta.schemaVersion} is not explicitly supported`,
      path.join(dir, "meta.json"),
    );
  }

  const standingNames = new Map<string, StandingRow>();
  for (const row of standings) {
    if (standingNames.has(row.displayName)) {
      push(
        issues,
        "error",
        "duplicate-standing-name",
        `Duplicate standings displayName "${row.displayName}"`,
        path.join(dir, "standings.json"),
      );
    }
    standingNames.set(row.displayName, row);
  }

  const deckNames = new Map<string, DeckEntry>();
  for (const deck of decks) {
    if (deckNames.has(deck.displayName)) {
      push(
        issues,
        "error",
        "duplicate-deck-name",
        `Duplicate decks displayName "${deck.displayName}"`,
        path.join(dir, "decks.json"),
      );
    }
    const standing = standingNames.get(deck.displayName);
    if (!standing) {
      push(
        issues,
        "warn",
        "deck-missing-standing",
        `Deck "${deck.displayName}" does not appear in standings`,
        path.join(dir, "decks.json"),
      );
    }
    if (deck.deckFile) {
      const fp = path.join(dir, "decklists", deck.deckFile);
      if (!fs.existsSync(fp)) {
        push(
          issues,
          "error",
          "missing-deck-file",
          `Deck file "${deck.deckFile}" for "${deck.displayName}" does not exist`,
          fp,
        );
      }
    }
    deckNames.set(deck.displayName, deck);
  }

  for (const standing of standings) {
    const deck = deckNames.get(standing.displayName);
    if (standing.hasDecklist && !deck?.deckFile) {
      push(
        issues,
        "warn",
        "standing-decklist-mismatch",
        `"${standing.displayName}" is marked hasDecklist=true but has no deck file`,
        path.join(dir, "standings.json"),
      );
    }
  }

  for (const match of matches) {
    const a = standingNames.get(match.playerA);
    if (!a) {
      push(
        issues,
        "error",
        "unknown-match-player-a",
        `Match references unknown playerA "${match.playerA}"`,
        path.join(dir, "matches.json"),
      );
    }

    if (match.bye) {
      if (match.playerB != null) {
        push(
          issues,
          "error",
          "bye-opponent-present",
          `Bye match at table ${match.table} should not have playerB`,
          path.join(dir, "matches.json"),
        );
      }
      continue;
    }

    if (!match.playerB) {
      push(
        issues,
        "error",
        "match-missing-player-b",
        `Non-bye match at table ${match.table} is missing playerB`,
        path.join(dir, "matches.json"),
      );
      continue;
    }

    const b = standingNames.get(match.playerB);
    if (!b) {
      push(
        issues,
        "error",
        "unknown-match-player-b",
        `Match references unknown playerB "${match.playerB}"`,
        path.join(dir, "matches.json"),
      );
    }

    // Validate Bo3 game scores so invalid entries don't throw inside scoring.
    const { gamesA, gamesB } = match;
    const validBo3 =
      (gamesA === 2 && gamesB < 2) ||
      (gamesB === 2 && gamesA < 2) ||
      (gamesA === 1 && gamesB === 1);
    if (!validBo3) {
      push(
        issues,
        "error",
        "invalid-bo3-score",
        `Match at table ${match.table} (${match.playerA} vs ${match.playerB}) has invalid Bo3 score ${gamesA}–${gamesB}`,
        path.join(dir, "matches.json"),
      );
    }
  }

  const nameToOracle = buildNameToOracle(cardCache);
  for (const deck of decks) {
    if (!deck.deckFile) continue;
    const fp = path.join(dir, "decklists", deck.deckFile);
    if (!fs.existsSync(fp)) continue;
    const parsed = parseDecklist(fs.readFileSync(fp, "utf8"));
    const unresolved = parsed.lines.filter(
      (line) => !nameToOracle.has(cardNameKey(line.name)),
    );
    if (unresolved.length > 0) {
      push(
        issues,
        unresolved.length === parsed.lines.length ? "error" : "warn",
        "unresolved-card-names",
        `${deck.displayName} has ${unresolved.length}/${parsed.lines.length} unresolved card names`,
        fp,
      );
    }
  }

  return issues;
}

export function assertTournamentBundleData(bundle: TournamentBundleData): void {
  const errors = validateTournamentBundleData(bundle).filter(
    (issue) => issue.level === "error",
  );
  if (errors.length === 0) return;
  const formatted = errors
    .map((issue) =>
      `${issue.code}: ${issue.message}${issue.file ? ` (${issue.file})` : ""}`,
    )
    .join("\n");
  throw new Error(`Tournament data validation failed:\n${formatted}`);
}
