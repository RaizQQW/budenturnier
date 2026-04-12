/**
 * Resolves all card names in tournament decklists via Scryfall
 * POST /cards/collection and writes data/tournaments/<slug>/card-cache.json
 *
 * Run: npx tsx scripts/cache-cards.ts
 */
import fs from "node:fs";
import path from "node:path";

import type { CardCacheEntry, CardCacheFile } from "../lib/types";
import { parseDecklist } from "../lib/parseDecklist";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "tournaments");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type ScryfallCard = {
  oracle_id: string;
  name: string;
  type_line: string;
  colors: string[];
  color_identity: string[];
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
  scryfall_uri?: string;
};

function toEntry(c: ScryfallCard): CardCacheEntry {
  const img =
    c.image_uris?.normal ??
    c.card_faces?.[0]?.image_uris?.normal ??
    undefined;
  return {
    oracle_id: c.oracle_id,
    name: c.name,
    type_line: c.type_line,
    colors: c.colors ?? [],
    color_identity: c.color_identity ?? [],
    image_normal: img,
    scryfall_uri: c.scryfall_uri,
  };
}

async function fetchCollection(names: string[]): Promise<ScryfallCard[]> {
  const out: ScryfallCard[] = [];
  const chunk = 75;
  for (let i = 0; i < names.length; i += chunk) {
    const part = names.slice(i, i + chunk);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifiers: part.map((name) => ({ name })),
      }),
    });
    if (!res.ok) {
      throw new Error(`Scryfall collection ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as {
      data?: ScryfallCard[];
      not_found?: unknown[];
    };
    out.push(...(body.data ?? []));
    if (body.not_found?.length) {
      console.warn("Scryfall not_found:", body.not_found);
    }
    await sleep(100);
  }
  return out;
}

async function fetchNamedFuzzy(name: string): Promise<ScryfallCard | null> {
  const u = new URL("https://api.scryfall.com/cards/named");
  u.searchParams.set("fuzzy", name);
  const res = await fetch(u);
  if (!res.ok) return null;
  return (await res.json()) as ScryfallCard;
}

async function main() {
  const slugs = fs
    .readdirSync(DATA, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const slug of slugs) {
    const deckDir = path.join(DATA, slug, "decklists");
    if (!fs.existsSync(deckDir)) continue;
    const names = new Set<string>();
    for (const f of fs.readdirSync(deckDir)) {
      if (!f.endsWith(".txt")) continue;
      const text = fs.readFileSync(path.join(deckDir, f), "utf8");
      for (const line of parseDecklist(text).lines) {
        names.add(line.name.trim());
      }
    }
    const unique = [...names];
    if (unique.length === 0) continue;

    console.log(slug, "unique card names:", unique.length);
    const resolved = await fetchCollection(unique);
    const cards: Record<string, CardCacheEntry> = {};
    const foundNames = new Set(resolved.map((c) => c.name.toLowerCase()));

    for (const c of resolved) {
      cards[c.oracle_id] = toEntry(c);
    }

    for (const n of unique) {
      if (foundNames.has(n.toLowerCase())) continue;
      const fuzzy = await fetchNamedFuzzy(n);
      await sleep(75);
      if (fuzzy) {
        cards[fuzzy.oracle_id] = toEntry(fuzzy);
        console.log("Fuzzy resolved:", n, "→", fuzzy.name);
      } else {
        console.warn("Could not resolve:", n);
      }
    }

    const outPath = path.join(DATA, slug, "card-cache.json");
    const payload: CardCacheFile = { cards };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
    console.log("Wrote", outPath, Object.keys(cards).length, "oracle_ids");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
