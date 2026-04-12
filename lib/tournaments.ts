import fs from "node:fs";
import path from "node:path";

import type { TournamentIndexFile } from "./types";

export function loadTournamentIndex(): TournamentIndexFile {
  const p = path.join(process.cwd(), "data", "tournaments", "index.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as TournamentIndexFile;
}

export function isValidSlug(slug: string): boolean {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return false;
  const dir = path.join(process.cwd(), "data", "tournaments", slug);
  return fs.existsSync(path.join(dir, "meta.json"));
}
