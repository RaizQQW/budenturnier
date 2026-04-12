import { cache } from "react";
import fs from "node:fs";
import path from "node:path";

import type {
  CardAggregateRow,
  CardCacheFile,
  CardPackageCorpusMeta,
  CardPerformanceCluster,
  CardPreviewPayload,
  DeckEntry,
  DeckWithCards,
  MatchRow,
  StandingRow,
  SuperArchetypePlayRate,
  TournamentMeta,
} from "./types";
export type { MatchRow };
import { cardNameKey, parseDecklist } from "./parseDecklist";
import {
  computePlayerScores,
  computeStandingsOnlyScores,
} from "./scoring";
import {
  computeMetagameMatrix,
  type MetagameMatrixPayload,
} from "./metagameMatrix";
import { applyArchetypeGroups } from "./archetypeGroups";
import { resolveHarmonizedArchetype } from "./harmonizeArchetype";
import { assertTournamentBundleData } from "./validation";
import { computeCardPerformanceClusters } from "./cardPerformanceClusters";

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
  assertTournamentBundleData({
    slug,
    dir,
    meta,
    standings,
    decks: decksFile,
    matches,
    cardCache,
  });
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
  matches: MatchRow[];
  playerScores: Map<string, import("./scoring").PlayerScoreBreakdown>;
  decksWithCards: DeckWithCards[];
  /** Oracle id → fields for hover previews in decklists. */
  cardPreviewsByOracle: Record<string, CardPreviewPayload>;
  /** Oracle id → mana value (cmc); undefined if not yet in cache. */
  cardCmcByOracle: Record<string, number>;
  /** Oracle id → type_line string (for land detection in mana curve). */
  cardTypesByOracle: Record<string, string>;
  cardRows: CardAggregateRow[];
  /** Co-occurrence clusters among better-performing decklists (see `cardPerformanceClusters.ts`). */
  cardPerformanceClusters: CardPerformanceCluster[];
  /** Non-null when card packages are shown; describes the TF-IDF corpus. */
  cardPackageCorpus: CardPackageCorpusMeta | null;
  decklistCoverage: { withList: number; total: number };
  metagame: MetagameMatrixPayload | null;
  /** Broader grouped-archetype matrix (e.g. all BG variants → "BG"). */
  metagameGrouped: MetagameMatrixPayload | null;
  /** Harmonized archetype presence among decklists on file. */
  superArchetypePlayRates: SuperArchetypePlayRate[];
  /** Grouped archetype play rates (using `meta.archetypeGroups`). */
  groupedPlayRates: SuperArchetypePlayRate[];
};

export const computeTournamentStats = cache(function computeTournamentStats(slug: string): TournamentStats {
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

  // --- Build deck rows (without percentile yet — need all scores first) ---
  type PartialDeck = Omit<DeckWithCards, "percentileScore">;

  const deckByName = new Map(decks.map((d) => [d.displayName, d]));
  const partialDecks: PartialDeck[] = [];
  let withList = 0;

  function pushDeck(
    d: DeckEntry,
    rank: number,
    perf: number,
    sw: number,
    br: number,
    pb: number,
    oracleQty: Record<string, { main: number; side: number }>,
    lines: import("./types").ParsedDeckLine[],
    resolvedOracleIds: Record<string, string>,
  ) {
    const arch = d.archetype ?? null;
    const harmonizedArchetype = resolveHarmonizedArchetype(
      d.harmonizedArchetype,
      { oracleQty, archetype: arch },
      cardCache,
    );
    partialDecks.push({
      playerId: d.playerId,
      displayName: d.displayName,
      archetype: arch,
      harmonizedArchetype,
      groupedArchetype: applyArchetypeGroups(
        harmonizedArchetype ?? arch,
        meta.archetypeGroups,
      ),
      rank,
      performanceScore: perf,
      swissMatchPoints: sw,
      bracketWeightedPoints: br,
      placementBonus: pb,
      oracleQty,
      lines,
      resolvedOracleIds,
    });
  }

  function processEntry(d: DeckEntry, rank: number) {
    const scoreRow = playerScores.get(d.displayName);
    const perf = scoreRow?.performanceScore ?? 0;
    const sw = scoreRow?.swissMatchPoints ?? 0;
    const br = scoreRow?.bracketWeightedPoints ?? 0;
    const pb = scoreRow?.placementBonus ?? 0;

    if (!d.deckFile) {
      pushDeck(d, rank, perf, sw, br, pb, {}, [], {});
      return;
    }
    const fp = path.join(dir, "decklists", d.deckFile);
    if (!fs.existsSync(fp)) {
      pushDeck(d, rank, perf, sw, br, pb, {}, [], {});
      return;
    }
    withList++;
    const text = fs.readFileSync(fp, "utf8");
    const parsed = parseDecklist(text);
    const resolved = resolveDeckToOracleIds(text, nameToOracle);
    const oracleQty = Object.fromEntries(
      buildOracleQtyFromLines(parsed.lines, resolved),
    );
    pushDeck(
      d, rank, perf, sw, br, pb,
      oracleQty, parsed.lines, Object.fromEntries(resolved),
    );
  }

  for (const st of standings) {
    const d =
      deckByName.get(st.displayName) ??
      ({
        playerId: st.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        displayName: st.displayName,
        deckFile: null,
        archetype: null,
      } satisfies DeckEntry);
    processEntry(d, st.rank);
  }

  const seenStandingNames = new Set(standings.map((s) => s.displayName));
  for (const d of decks) {
    if (seenStandingNames.has(d.displayName)) continue;
    processEntry(d, 999);
  }

  // --- Compute midpoint percentile ranks ---
  const scores = partialDecks.map((d) => d.performanceScore);
  const N = scores.length;
  const sortedScores = [...scores].sort((a, b) => a - b);
  const percentileOf = (score: number): number => {
    if (N <= 1) return 50;
    let below = 0;
    let equal = 0;
    for (const s of sortedScores) {
      if (s < score) below++;
      else if (s === score) equal++;
    }
    return ((below + equal / 2) / N) * 100;
  };

  const decksWithCards: DeckWithCards[] = partialDecks.map((pd) => ({
    ...pd,
    percentileScore: percentileOf(pd.performanceScore),
  }));

  const totalPlayers = standings.length;
  const decklistCoverage = { withList, total: totalPlayers };

  // --- Card aggregation (dual-track: raw + percentile, copy-weighted) ---
  const decksOnFile = decksWithCards.filter((d) => Object.keys(d.oracleQty).length > 0);
  const BAYES_K = Math.max(2, Math.round(decksOnFile.length / 3));
  const totalPctlSum = decksOnFile.reduce((s, d) => s + d.percentileScore, 0);
  const globalAvgPercentile =
    decksOnFile.length > 0 ? totalPctlSum / decksOnFile.length : 50;

  // Pre-compute total cards per deck for copy-weight denominator
  const deckTotalCards = new Map<string, number>();
  for (const dw of decksOnFile) {
    let total = 0;
    for (const q of Object.values(dw.oracleQty)) total += q.main + q.side;
    deckTotalCards.set(dw.playerId, total || 1);
  }

  const agg = new Map<
    string,
    {
      sumScore: number;
      sumPctl: number;
      weightedSumPctl: number;
      weightSum: number;
      deckCount: number;
      topCutDeckCount: number;
      bestRank: number;
      mainQty: number;
      sideQty: number;
      totalQty: number;
    }
  >();

  for (const dw of decksWithCards) {
    const oracleKeys = Object.keys(dw.oracleQty);
    if (oracleKeys.length === 0) continue;
    const totalCardsInDeck = deckTotalCards.get(dw.playerId) ?? 1;
    const seenInDeck = new Set<string>();
    for (const oid of new Set(oracleKeys)) {
      if (seenInDeck.has(oid)) continue;
      seenInDeck.add(oid);
      const cur = agg.get(oid) ?? {
        sumScore: 0,
        sumPctl: 0,
        weightedSumPctl: 0,
        weightSum: 0,
        deckCount: 0,
        topCutDeckCount: 0,
        bestRank: 999,
        mainQty: 0,
        sideQty: 0,
        totalQty: 0,
      };
      const q = dw.oracleQty[oid]!;
      const copies = q.main + q.side;
      const copyWeight = copies / totalCardsInDeck;
      cur.sumScore += dw.performanceScore;
      cur.sumPctl += dw.percentileScore;
      cur.weightedSumPctl += dw.percentileScore * copyWeight;
      cur.weightSum += copyWeight;
      cur.deckCount += 1;
      if (dw.rank <= 4) cur.topCutDeckCount += 1;
      cur.bestRank = Math.min(cur.bestRank, dw.rank);
      cur.mainQty += q.main;
      cur.sideQty += q.side;
      cur.totalQty += copies;
      agg.set(oid, cur);
    }
  }

  const cardRows: CardAggregateRow[] = [];
  for (const [oracle_id, v] of agg) {
    const c = cardCache.cards[oracle_id];
    const name = c?.name ?? oracle_id;
    const type_line = c?.type_line ?? "";
    const colors =
      c?.colors && c.colors.length > 0
        ? c.colors
        : (c?.color_identity ?? []);

    // Copy-weighted percentile avg: a 4-of counts 4x as much as a 1-of
    const weightedAvgPctl =
      v.weightSum > 0 ? v.weightedSumPctl / v.weightSum : 50;
    // Bayesian shrinkage: use deck count as the confidence measure so that
    // copy-proportion fractions (always <<1) don't swamp the prior.
    const adjustedAvgPercentile =
      (v.deckCount * weightedAvgPctl + BAYES_K * globalAvgPercentile) /
      (v.deckCount + BAYES_K);

    // Delta uses unweighted avg (presence-based) for interpretability
    const avgPctl = v.sumPctl / v.deckCount;
    const decksWithout = decksOnFile.length - v.deckCount;
    const avgPctlWithout =
      decksWithout > 0
        ? (totalPctlSum - v.sumPctl) / decksWithout
        : globalAvgPercentile;
    const winRateDelta = avgPctl - avgPctlWithout;

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
      sumPercentile: v.sumPctl,
      avgPercentile: avgPctl,
      adjustedAvgPercentile,
      winRateDelta,
      topCutDeckCount: v.topCutDeckCount,
      topCutRate: v.deckCount > 0 ? v.topCutDeckCount / v.deckCount : 0,
      bestRank: v.bestRank,
      avgMainCopies: v.deckCount > 0 ? v.mainQty / v.deckCount : 0,
      avgSideCopies: v.deckCount > 0 ? v.sideQty / v.deckCount : 0,
      sideboardCopyShare:
        v.totalQty > 0 ? Math.min(1, v.sideQty / v.totalQty) : 0,
      mainCopyShare:
        v.totalQty > 0 ? Math.min(1, (v.totalQty - v.sideQty) / v.totalQty) : 0,
      playRate: decksOnFile.length > 0 ? v.deckCount / decksOnFile.length : 0,
      totalCopiesPlayed: v.totalQty,
    });
  }

  cardRows.sort((a, b) => b.adjustedAvgPercentile - a.adjustedAvgPercentile);

  const { clusters: cardPerformanceClusters, corpus: cardPackageCorpus } =
    computeCardPerformanceClusters(decksWithCards, cardCache, cardRows);

  const playerToSuperArch = new Map<string, string>();
  for (const dw of decksWithCards) {
    const tag = (dw.harmonizedArchetype ?? dw.archetype)?.trim();
    if (!tag) continue;
    playerToSuperArch.set(dw.displayName, tag);
  }
  const metagame =
    matches.length > 0
      ? computeMetagameMatrix(matches, playerToSuperArch)
      : null;

  let metagameGrouped: MetagameMatrixPayload | null = null;
  if (matches.length > 0 && meta.archetypeGroups) {
    const playerToGrouped = new Map<string, string>();
    for (const [player, arch] of playerToSuperArch) {
      playerToGrouped.set(
        player,
        applyArchetypeGroups(arch, meta.archetypeGroups) ?? arch,
      );
    }
    metagameGrouped = computeMetagameMatrix(matches, playerToGrouped);
  }

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

  const groupedPlayRates: SuperArchetypePlayRate[] = [];
  if (taggedDecklists > 0 && meta.archetypeGroups) {
    const groupLookup = new Map<string, string>();
    for (const [group, members] of Object.entries(meta.archetypeGroups)) {
      for (const m of members) groupLookup.set(m, group);
    }
    const groupedCount = new Map<string, number>();
    for (const [arch, count] of harmonizedListCount) {
      const g = groupLookup.get(arch) ?? arch;
      groupedCount.set(g, (groupedCount.get(g) ?? 0) + count);
    }
    for (const [archetype, decklistsWith] of groupedCount) {
      groupedPlayRates.push({
        archetype,
        decklistsWith,
        decklistsTotal: taggedDecklists,
        playRate: decklistsWith / taggedDecklists,
      });
    }
    groupedPlayRates.sort(
      (a, b) =>
        b.playRate - a.playRate || a.archetype.localeCompare(b.archetype),
    );
  }

  const cardPreviewsByOracle: Record<string, CardPreviewPayload> = {};
  const cardCmcByOracle: Record<string, number> = {};
  const cardTypesByOracle: Record<string, string> = {};
  for (const [id, c] of Object.entries(cardCache.cards)) {
    cardPreviewsByOracle[id] = {
      name: c.name,
      type_line: c.type_line,
      image_normal: c.image_normal,
      scryfall_uri: c.scryfall_uri,
    };
    if (c.cmc != null) cardCmcByOracle[id] = c.cmc;
    cardTypesByOracle[id] = c.type_line;
  }

  return {
    slug,
    meta,
    standings,
    matches,
    playerScores,
    decksWithCards,
    cardPreviewsByOracle,
    cardCmcByOracle,
    cardTypesByOracle,
    cardRows,
    cardPerformanceClusters,
    cardPackageCorpus,
    decklistCoverage,
    metagame,
    metagameGrouped,
    superArchetypePlayRates,
    groupedPlayRates,
  };
});
