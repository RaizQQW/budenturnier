import fs from "node:fs";
import path from "node:path";

import type {
  CardAggregateRow,
  CardCacheFile,
  CardPerformanceCluster,
  CardPreviewPayload,
  DeckEntry,
  DeckWithCards,
  MatchRow,
  StandingRow,
  SuperArchetypePlayRate,
  TournamentMeta,
} from "./types";
import { cardNameKey, parseDecklist } from "./parseDecklist";
import {
  computePlayerScores,
  computeStandingsOnlyScores,
} from "./scoring";
import { clusterDecksByMainNonland } from "./clustering";
import {
  computeMetagameMatrix,
  type MetagameMatrixPayload,
} from "./metagameMatrix";
import { resolveHarmonizedArchetype } from "./harmonizeArchetype";
import { computeCardPerformanceClusters } from "./cardPerformanceClusters";

function slugifyDisplayName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tournamentDir(slug: string): string {
  return path.join(process.cwd(), "data", "tournaments", slug);
}

export function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function loadTournamentBundle(slug: string) {
  const dir = tournamentDir(slug);
  const meta = loadJson<TournamentMeta>(path.join(dir, "meta.json"));
  const standings = loadJson<{ standings: StandingRow[] }>(
    path.join(dir, "standings.json"),
  ).standings;
  const decksFile = loadJson<{ decks: DeckEntry[] }>(
    path.join(dir, "decks.json"),
  ).decks;
  const matchesPath = path.join(dir, "matches.json");
  const matches: MatchRow[] = fs.existsSync(matchesPath)
    ? loadJson<{ matches: MatchRow[] }>(matchesPath).matches
    : [];
  const cachePath = path.join(dir, "card-cache.json");
  const cardCache: CardCacheFile = fs.existsSync(cachePath)
    ? loadJson<CardCacheFile>(cachePath)
    : { cards: {} };
  return { dir, meta, standings, decks: decksFile, matches, cardCache };
}

export function resolveDeckToOracleIds(
  deckText: string,
  nameToOracle: Map<string, string>,
): Map<string, string> {
  const parsed = parseDecklist(deckText);
  const resolved = new Map<string, string>();
  for (const line of parsed.lines) {
    const key = cardNameKey(line.name);
    const oid = nameToOracle.get(key);
    if (oid) resolved.set(key, oid);
  }
  return resolved;
}

export function buildOracleQtyFromLines(
  lines: import("./types").ParsedDeckLine[],
  resolved: Map<string, string>,
): Map<string, { main: number; side: number }> {
  const m = new Map<string, { main: number; side: number }>();
  for (const line of lines) {
    const oid = resolved.get(cardNameKey(line.name));
    if (!oid) continue;
    const cur = m.get(oid) ?? { main: 0, side: 0 };
    if (line.board === "main") cur.main += line.qty;
    else cur.side += line.qty;
    m.set(oid, cur);
  }
  return m;
}

export type TournamentStats = {
  slug: string;
  meta: TournamentMeta;
  standings: StandingRow[];
  playerScores: Map<string, import("./scoring").PlayerScoreBreakdown>;
  decksWithCards: DeckWithCards[];
  /** Oracle id → fields for hover previews in decklists. */
  cardPreviewsByOracle: Record<string, CardPreviewPayload>;
  cardRows: CardAggregateRow[];
  /** Co-occurrence clusters among better-performing decklists (see `cardPerformanceClusters.ts`). */
  cardPerformanceClusters: CardPerformanceCluster[];
  decklistCoverage: { withList: number; total: number };
  archetypeRows: { archetype: string; deckCount: number; avgScore: number }[];
  clusters: import("./types").ArchetypeCluster[];
  metagame: MetagameMatrixPayload | null;
  /** Harmonized archetype presence among decklists on file. */
  superArchetypePlayRates: SuperArchetypePlayRate[];
};

export function computeTournamentStats(slug: string): TournamentStats {
  const { dir, meta, standings, decks, matches, cardCache } =
    loadTournamentBundle(slug);

  const nameToOracle = new Map<string, string>();
  for (const c of Object.values(cardCache.cards)) {
    nameToOracle.set(cardNameKey(c.name), c.oracle_id);
    if (c.name.includes("//")) {
      const front = c.name.split("//")[0]?.trim();
      if (front) nameToOracle.set(cardNameKey(front), c.oracle_id);
    }
  }

  const playerScores =
    matches.length > 0
      ? computePlayerScores(matches, standings, meta)
      : computeStandingsOnlyScores(standings, meta);

  const deckByName = new Map(decks.map((d) => [d.displayName, d]));
  const decksWithCards: DeckWithCards[] = [];
  let withList = 0;

  for (const st of standings) {
    const d =
      deckByName.get(st.displayName) ??
      ({
        playerId: slugifyDisplayName(st.displayName),
        displayName: st.displayName,
        deckFile: null,
        archetype: null,
      } satisfies DeckEntry);
    const rank = st.rank;
    const scoreRow = playerScores.get(st.displayName);
    const perf = scoreRow?.performanceScore ?? 0;
    const sw = scoreRow?.swissMatchPoints ?? 0;
    const br = scoreRow?.bracketWeightedPoints ?? 0;
    const pb = scoreRow?.placementBonus ?? 0;

    if (!d.deckFile) {
      const arch = d.archetype ?? null;
      decksWithCards.push({
        playerId: d.playerId,
        displayName: d.displayName,
        archetype: arch,
        harmonizedArchetype: resolveHarmonizedArchetype(
          d.harmonizedArchetype,
          { oracleQty: {}, archetype: arch },
          cardCache,
        ),
        rank,
        performanceScore: perf,
        swissMatchPoints: sw,
        bracketWeightedPoints: br,
        placementBonus: pb,
        oracleQty: {},
        lines: [],
        resolvedOracleIds: {},
      });
      continue;
    }

    const fp = path.join(dir, "decklists", d.deckFile);
    if (!fs.existsSync(fp)) {
      const arch = d.archetype ?? null;
      decksWithCards.push({
        playerId: d.playerId,
        displayName: d.displayName,
        archetype: arch,
        harmonizedArchetype: resolveHarmonizedArchetype(
          d.harmonizedArchetype,
          { oracleQty: {}, archetype: arch },
          cardCache,
        ),
        rank,
        performanceScore: perf,
        swissMatchPoints: sw,
        bracketWeightedPoints: br,
        placementBonus: pb,
        oracleQty: {},
        lines: [],
        resolvedOracleIds: {},
      });
      continue;
    }

    withList++;
    const text = fs.readFileSync(fp, "utf8");
    const parsed = parseDecklist(text);
    const resolved = resolveDeckToOracleIds(text, nameToOracle);
    const oracleQty = Object.fromEntries(
      buildOracleQtyFromLines(parsed.lines, resolved),
    );
    const arch = d.archetype ?? null;
    decksWithCards.push({
      playerId: d.playerId,
      displayName: d.displayName,
      archetype: arch,
      harmonizedArchetype: resolveHarmonizedArchetype(
        d.harmonizedArchetype,
        { oracleQty, archetype: arch },
        cardCache,
      ),
      rank,
      performanceScore: perf,
      swissMatchPoints: sw,
      bracketWeightedPoints: br,
      placementBonus: pb,
      oracleQty,
      lines: parsed.lines,
      resolvedOracleIds: Object.fromEntries(resolved),
    });
  }

  const seenStandingNames = new Set(standings.map((s) => s.displayName));
  for (const d of decks) {
    if (seenStandingNames.has(d.displayName)) continue;
    const rank = 999;
    const scoreRow = playerScores.get(d.displayName);
    const perf = scoreRow?.performanceScore ?? 0;
    const sw = scoreRow?.swissMatchPoints ?? 0;
    const br = scoreRow?.bracketWeightedPoints ?? 0;
    const pb = scoreRow?.placementBonus ?? 0;
    if (!d.deckFile) {
      const arch = d.archetype ?? null;
      decksWithCards.push({
        playerId: d.playerId,
        displayName: d.displayName,
        archetype: arch,
        harmonizedArchetype: resolveHarmonizedArchetype(
          d.harmonizedArchetype,
          { oracleQty: {}, archetype: arch },
          cardCache,
        ),
        rank,
        performanceScore: perf,
        swissMatchPoints: sw,
        bracketWeightedPoints: br,
        placementBonus: pb,
        oracleQty: {},
        lines: [],
        resolvedOracleIds: {},
      });
      continue;
    }
    const fp = path.join(dir, "decklists", d.deckFile);
    if (!fs.existsSync(fp)) {
      const arch = d.archetype ?? null;
      decksWithCards.push({
        playerId: d.playerId,
        displayName: d.displayName,
        archetype: arch,
        harmonizedArchetype: resolveHarmonizedArchetype(
          d.harmonizedArchetype,
          { oracleQty: {}, archetype: arch },
          cardCache,
        ),
        rank,
        performanceScore: perf,
        swissMatchPoints: sw,
        bracketWeightedPoints: br,
        placementBonus: pb,
        oracleQty: {},
        lines: [],
        resolvedOracleIds: {},
      });
      continue;
    }
    withList++;
    const text = fs.readFileSync(fp, "utf8");
    const parsed = parseDecklist(text);
    const resolved = resolveDeckToOracleIds(text, nameToOracle);
    const oracleQty = Object.fromEntries(
      buildOracleQtyFromLines(parsed.lines, resolved),
    );
    const arch = d.archetype ?? null;
    decksWithCards.push({
      playerId: d.playerId,
      displayName: d.displayName,
      archetype: arch,
      harmonizedArchetype: resolveHarmonizedArchetype(
        d.harmonizedArchetype,
        { oracleQty, archetype: arch },
        cardCache,
      ),
      rank,
      performanceScore: perf,
      swissMatchPoints: sw,
      bracketWeightedPoints: br,
      placementBonus: pb,
      oracleQty,
      lines: parsed.lines,
      resolvedOracleIds: Object.fromEntries(resolved),
    });
  }

  const totalPlayers = standings.length;
  const decklistCoverage = { withList, total: totalPlayers };

  /** oracle_id -> aggregate */
  const agg = new Map<
    string,
    {
      sumScore: number;
      deckCount: number;
      topCutDeckCount: number;
      bestRank: number;
      sideQty: number;
      totalQty: number;
    }
  >();

  for (const dw of decksWithCards) {
    const oracleKeys = Object.keys(dw.oracleQty);
    if (oracleKeys.length === 0) continue;
    const seenInDeck = new Set<string>();
    for (const oid of new Set(oracleKeys)) {
      if (seenInDeck.has(oid)) continue;
      seenInDeck.add(oid);
      const cur = agg.get(oid) ?? {
        sumScore: 0,
        deckCount: 0,
        topCutDeckCount: 0,
        bestRank: 999,
        sideQty: 0,
        totalQty: 0,
      };
      cur.sumScore += dw.performanceScore;
      cur.deckCount += 1;
      if (dw.rank <= 4) cur.topCutDeckCount += 1;
      cur.bestRank = Math.min(cur.bestRank, dw.rank);
      const q = dw.oracleQty[oid]!;
      cur.sideQty += q.side;
      cur.totalQty += q.main + q.side;
      agg.set(oid, cur);
    }
  }

  const cardRows: CardAggregateRow[] = [];
  for (const [oracle_id, v] of agg) {
    const c = cardCache.cards[oracle_id];
    const name = c?.name ?? oracle_id;
    const type_line = c?.type_line ?? "";
    const colors = c?.colors ?? c?.color_identity ?? [];
    cardRows.push({
      oracle_id,
      name,
      type_line,
      colors,
      image_normal: c?.image_normal,
      scryfall_uri: c?.scryfall_uri,
      deckCount: v.deckCount,
      sumPerformanceScore: v.sumScore,
      avgPerformanceScore: v.sumScore / v.deckCount,
      topCutDeckCount: v.topCutDeckCount,
      bestRank: v.bestRank,
      sideboardCopyShare:
        v.totalQty > 0 ? Math.min(1, v.sideQty / v.totalQty) : 0,
      mainCopyShare:
        v.totalQty > 0 ? Math.min(1, (v.totalQty - v.sideQty) / v.totalQty) : 0,
      playRate: withList > 0 ? v.deckCount / withList : 0,
    });
  }

  cardRows.sort((a, b) => b.sumPerformanceScore - a.sumPerformanceScore);

  const cardPerformanceClusters = computeCardPerformanceClusters(
    decksWithCards,
    cardCache,
    cardRows,
  );

  const archMap = new Map<string, { sum: number; n: number }>();
  for (const dw of decksWithCards) {
    const a = dw.archetype?.trim();
    if (!a) continue;
    const cur = archMap.get(a) ?? { sum: 0, n: 0 };
    cur.sum += dw.performanceScore;
    cur.n += 1;
    archMap.set(a, cur);
  }
  const archetypeRows = [...archMap.entries()]
    .map(([archetype, { sum, n }]) => ({
      archetype,
      deckCount: n,
      avgScore: sum / n,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const clusters = clusterDecksByMainNonland(decksWithCards, cardCache, 3);

  const playerToSuperArch = new Map<string, string>();
  for (const dw of decksWithCards) {
    const tag = (dw.harmonizedArchetype ?? dw.archetype)?.trim();
    if (tag) playerToSuperArch.set(dw.displayName, tag);
  }
  const metagame =
    matches.length > 0
      ? computeMetagameMatrix(matches, playerToSuperArch)
      : null;

  const harmonizedListCount = new Map<string, number>();
  let taggedDecklists = 0;
  for (const dw of decksWithCards) {
    if (dw.lines.length === 0) continue;
    const t = (dw.harmonizedArchetype ?? dw.archetype)?.trim();
    if (!t) continue;
    taggedDecklists++;
    harmonizedListCount.set(t, (harmonizedListCount.get(t) ?? 0) + 1);
  }
  const superArchetypePlayRates: SuperArchetypePlayRate[] = [];
  if (taggedDecklists > 0) {
    for (const [archetype, decklistsWith] of harmonizedListCount) {
      superArchetypePlayRates.push({
        archetype,
        decklistsWith,
        decklistsTotal: taggedDecklists,
        playRate: decklistsWith / taggedDecklists,
      });
    }
    superArchetypePlayRates.sort(
      (a, b) =>
        b.playRate - a.playRate || a.archetype.localeCompare(b.archetype),
    );
  }

  const cardPreviewsByOracle: Record<string, CardPreviewPayload> = {};
  for (const [id, c] of Object.entries(cardCache.cards)) {
    cardPreviewsByOracle[id] = {
      name: c.name,
      type_line: c.type_line,
      image_normal: c.image_normal,
      scryfall_uri: c.scryfall_uri,
    };
  }

  return {
    slug,
    meta,
    standings,
    playerScores,
    decksWithCards,
    cardPreviewsByOracle,
    cardRows,
    cardPerformanceClusters,
    decklistCoverage,
    archetypeRows,
    clusters,
    metagame,
    superArchetypePlayRates,
  };
}
