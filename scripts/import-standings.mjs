#!/usr/bin/env node
/**
 * Import standings from a simple TSV (tab-separated) file into standings.json.
 *
 * Columns: rank, displayName, matchPoints, omwPercent, gwPercent, ogwPercent, hasDecklist
 * hasDecklist: true/false or yes/no
 *
 * Usage: node scripts/import-standings.mjs <slug> <input.tsv>
 * Writes: data/tournaments/<slug>/standings.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const [, , slug, tsvPath] = process.argv;
if (!slug || !tsvPath) {
  console.error(
    "Usage: node scripts/import-standings.mjs <slug> <standings.tsv>",
  );
  process.exit(1);
}

const text = fs.readFileSync(tsvPath, "utf8");
const standings = [];
const seenNames = new Set();
const seenRanks = new Set();

for (const line of text.split(/\r?\n/)) {
  if (!line.trim()) continue;
  const parts = line.split("\t");
  if (parts.length < 3) continue;
  const [
    rankStr,
    displayName,
    matchPointsStr,
    omw,
    gw,
    ogw,
    hasDeckStr,
  ] = parts;
  const rank = Number(rankStr);
  const matchPoints = Number(matchPointsStr);
  if (!displayName?.trim() || !Number.isFinite(rank)) continue;
  const name = displayName.trim();
  if (seenNames.has(name)) {
    console.error("Duplicate standings displayName:", name);
    process.exit(1);
  }
  if (seenRanks.has(rank)) {
    console.error("Duplicate standings rank:", rank);
    process.exit(1);
  }
  const h = (hasDeckStr ?? "").trim().toLowerCase();
  const hasDecklist =
    (h.includes("decklist") && !h.includes("no")) ||
    /^(y|yes|true|1)$/.test(h);
  const row = {
    rank,
    displayName: name,
    matchPoints: Number.isFinite(matchPoints) ? matchPoints : 0,
    hasDecklist,
  };
  if (omw?.trim()) row.omwPercent = Number(omw);
  if (gw?.trim()) row.gwPercent = Number(gw);
  if (ogw?.trim()) row.ogwPercent = Number(ogw);
  seenNames.add(name);
  seenRanks.add(rank);
  standings.push(row);
}

standings.sort((a, b) => a.rank - b.rank);

const outDir = path.join(root, "data", "tournaments", slug);
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "standings.json");
fs.writeFileSync(
  outFile,
  JSON.stringify({ standings }, null, 2),
  "utf8",
);
console.log("Wrote", outFile, standings.length, "rows");
