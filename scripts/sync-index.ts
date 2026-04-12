/**
 * Scans data/tournaments/ for tournament folders and auto-generates index.json.
 * Run with: npm run sync:index
 *
 * Each folder must contain meta.json to be included. Player and decklist counts
 * are derived from standings.json and decks.json when present.
 */

import fs from "node:fs";
import path from "node:path";

import type {
  DeckEntry,
  StandingRow,
  TournamentIndexEntry,
  TournamentMeta,
} from "../lib/types";

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function main() {
  const tournamentsDir = path.join(process.cwd(), "data", "tournaments");
  const indexPath = path.join(tournamentsDir, "index.json");

  const entries = fs.readdirSync(tournamentsDir, { withFileTypes: true });
  const slugFolders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) =>
      fs.existsSync(path.join(tournamentsDir, name, "meta.json")),
    );

  if (slugFolders.length === 0) {
    console.log("No tournament folders with meta.json found.");
    return;
  }

  const tournaments: TournamentIndexEntry[] = [];

  for (const slug of slugFolders) {
    const dir = path.join(tournamentsDir, slug);
    const meta = readJson<TournamentMeta>(path.join(dir, "meta.json"));

    let playerCount: number | undefined;
    let decklistsWith: number | undefined;

    const standingsPath = path.join(dir, "standings.json");
    if (fs.existsSync(standingsPath)) {
      const { standings } = readJson<{ standings: StandingRow[] }>(standingsPath);
      playerCount = standings.length;
      decklistsWith = standings.filter((s) => s.hasDecklist).length;
    } else {
      const decksPath = path.join(dir, "decks.json");
      if (fs.existsSync(decksPath)) {
        const { decks } = readJson<{ decks: DeckEntry[] }>(decksPath);
        playerCount = decks.length;
        decklistsWith = decks.filter((d) => d.deckFile != null).length;
      }
    }

    const entry: TournamentIndexEntry = {
      slug: meta.slug,
      title: meta.title,
      date: meta.date,
      ...(meta.format ? { format: meta.format } : {}),
      ...(playerCount != null ? { playerCount } : {}),
      ...(decklistsWith != null ? { decklistsWith } : {}),
    };
    tournaments.push(entry);
    console.log(`  + ${meta.slug} (${meta.title}, ${meta.date})`);
  }

  // Sort newest first
  tournaments.sort((a, b) => b.date.localeCompare(a.date));

  const output = JSON.stringify({ tournaments }, null, 2) + "\n";
  fs.writeFileSync(indexPath, output, "utf8");
  console.log(
    `\nWrote ${tournaments.length} tournament(s) to data/tournaments/index.json`,
  );
}

main();
