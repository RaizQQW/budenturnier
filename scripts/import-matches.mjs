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

for (const m of raw.matches) {
  if (!m.phase || !["swiss", "bracket"].includes(m.phase)) {
    console.error("Invalid match phase", m);
    process.exit(1);
  }
  if (typeof m.playerA !== "string") {
    console.error("Invalid match playerA", m);
    process.exit(1);
  }
}

const outDir = path.join(root, "data", "tournaments", slug);
fs.mkdirSync(outDir, { recursive: true });
const dest = path.join(outDir, "matches.json");
fs.writeFileSync(dest, JSON.stringify(raw, null, 2), "utf8");
console.log("Wrote", dest, raw.matches.length, "matches");
