import fs from "node:fs";
import path from "node:path";

import type {
  CardCacheFile,
  DeckEntry,
  MatchRow,
  StandingRow,
  TournamentMeta,
} from "../lib/types";
import { parseTournamentIndex, validateTournamentBundleData } from "../lib/validation";

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function loadBundle(slug: string) {
  const dir = path.join(process.cwd(), "data", "tournaments", slug);
  const meta = readJson<TournamentMeta>(path.join(dir, "meta.json"));
  const standings = readJson<{ standings: StandingRow[] }>(
    path.join(dir, "standings.json"),
  ).standings;
  const decks = readJson<{ decks: DeckEntry[] }>(path.join(dir, "decks.json")).decks;
  const matchesPath = path.join(dir, "matches.json");
  const matches = fs.existsSync(matchesPath)
    ? readJson<{ matches: MatchRow[] }>(matchesPath).matches
    : [];
  const cachePath = path.join(dir, "card-cache.json");
  const cardCache = fs.existsSync(cachePath)
    ? readJson<CardCacheFile>(cachePath)
    : { cards: {} };
  return { slug, dir, meta, standings, decks, matches, cardCache };
}

function main() {
  const indexPath = path.join(process.cwd(), "data", "tournaments", "index.json");
  const index = parseTournamentIndex(readJson(indexPath));

  let errorCount = 0;
  let warnCount = 0;

  for (const entry of index.tournaments) {
    const bundle = loadBundle(entry.slug);
    const issues = validateTournamentBundleData(bundle);
    const relSlug = `data/tournaments/${entry.slug}`;

    if (issues.length === 0) {
      console.log(`OK  ${relSlug}`);
      continue;
    }

    console.log(`CHECK ${relSlug}`);
    for (const issue of issues) {
      const prefix = issue.level === "error" ? "ERROR" : "WARN ";
      console.log(`  ${prefix} ${issue.code}: ${issue.message}`);
      if (issue.level === "error") errorCount++;
      else warnCount++;
    }
  }

  console.log(
    `\nData check finished with ${errorCount} error(s) and ${warnCount} warning(s).`,
  );
  if (errorCount > 0) process.exit(1);
}

main();
