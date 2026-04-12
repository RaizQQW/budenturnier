#!/usr/bin/env node
/**
 * Validates or merges a matches.json file for a tournament slug.
 *
 * Usage:
 *   node scripts/import-matches.mjs <slug> <matches.json>
 *
 * Copies the input file to data/tournaments/<slug>/matches.json after
 * light validation (expects { "matches": [ ... ] }).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const [, , slug, inputPath] = process.argv;
if (!slug || !inputPath) {
  console.error(
    "Usage: node scripts/import-matches.mjs <slug> <matches.json>",
  );
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!Array.isArray(raw.matches)) {
  console.error("Invalid file: expected { matches: MatchRow[] }");
  process.exit(1);
}

const standingsPath = path.join(root, "data", "tournaments", slug, "standings.json");
const knownNames = fs.existsSync(standingsPath)
  ? new Set(
      (JSON.parse(fs.readFileSync(standingsPath, "utf8")).standings ?? []).map(
        (row) => row.displayName,
      ),
    )
  : null;

for (const m of raw.matches) {
  if (!m.phase || !["swiss", "bracket"].includes(m.phase)) {
    console.error("Invalid match phase", m);
    process.exit(1);
  }
  if (typeof m.playerA !== "string") {
    console.error("Invalid match playerA", m);
    process.exit(1);
  }
  if (!m.bye && typeof m.playerB !== "string") {
    console.error("Non-bye match must include playerB", m);
    process.exit(1);
  }
  if (m.bye && m.playerB != null) {
    console.error("Bye match must not include playerB", m);
    process.exit(1);
  }
  if (knownNames && !knownNames.has(m.playerA)) {
    console.error("playerA not found in standings", m.playerA);
    process.exit(1);
  }
  if (knownNames && m.playerB && !knownNames.has(m.playerB)) {
    console.error("playerB not found in standings", m.playerB);
    process.exit(1);
  }
}

const outDir = path.join(root, "data", "tournaments", slug);
fs.mkdirSync(outDir, { recursive: true });
const dest = path.join(outDir, "matches.json");
fs.writeFileSync(dest, JSON.stringify(raw, null, 2), "utf8");
console.log("Wrote", dest, raw.matches.length, "matches");
