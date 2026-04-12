import { cardNameKey } from "./parseDecklist";
import type {
  CardAggregateRow,
  CardCacheFile,
  CardPerformanceCluster,
  DeckWithCards,
} from "./types";

function isNonlandMain(
  oid: string,
  lineBoard: "main" | "side",
  cache: CardCacheFile,
): boolean {
  if (lineBoard !== "main") return false;
  const c = cache.cards[oid];
  if (!c?.type_line) return true;
  if (/\bLand\b/.test(c.type_line)) return false;
  if (/\bBasic\b.*\bLand\b/.test(c.type_line)) return false;
  return true;
}

function medianSorted(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[m]!
    : (sorted[m - 1]! + sorted[m]!) / 2;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  return medianSorted([...nums].sort((a, b) => a - b));
}

function mainNonlandQty(
  dw: DeckWithCards,
  oid: string,
  cache: CardCacheFile,
): number {
  let q = 0;
  for (const line of dw.lines) {
    const rOid = dw.resolvedOracleIds[cardNameKey(line.name)];
    if (rOid !== oid || line.board !== "main") continue;
    if (!isNonlandMain(oid, line.board, cache)) continue;
    q += line.qty;
  }
  return q;
}

function cosineSim(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  let dot = 0;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (vb != null) dot += va * vb;
  }
  return dot;
}

function normalizeL2(v: Map<string, number>): void {
  const norm = Math.hypot(...v.values()) || 1;
  for (const k of v.keys()) v.set(k, (v.get(k) ?? 0) / norm);
}

function pickInitialCentroids(
  vectors: Map<string, number>[],
  k: number,
): Map<string, number>[] {
  const centroids: Map<string, number>[] = [];
  const step = Math.max(1, Math.floor(vectors.length / k));
  for (let i = 0; i < k; i++) {
    const idx = Math.min(vectors.length - 1, i * step);
    centroids.push(new Map(vectors[idx]));
  }
  return centroids;
}

function centroidMean(
  vectors: Map<string, number>[],
  assign: number[],
  cluster: number,
): Map<string, number> {
  const sum = new Map<string, number>();
  let n = 0;
  for (let i = 0; i < vectors.length; i++) {
    if (assign[i] !== cluster) continue;
    n++;
    for (const [k, val] of vectors[i]) {
      sum.set(k, (sum.get(k) ?? 0) + val);
    }
  }
  const out = new Map<string, number>();
  if (n === 0) return out;
  for (const [k, s] of sum) out.set(k, s / n);
  normalizeL2(out);
  return out;
}

function labelFromCentroid(
  centroid: Map<string, number>,
  members: string[],
  vectors: Map<string, number>[],
  memberIndex: Map<string, number>,
  cache: CardCacheFile,
  top = 3,
): string {
  const scored = members.map((oid) => {
    const i = memberIndex.get(oid);
    const v = i != null ? vectors[i] : new Map<string, number>();
    return { oid, s: cosineSim(v, centroid) };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored
    .slice(0, top)
    .map(({ oid }) => cache.cards[oid]?.name ?? oid)
    .join(" · ");
}

/**
 * k-means on cards that co-occur in the **upper half** of decklists by
 * **percentile score** (main nonland only, TF-IDF over those decks).
 * Eligible cards must clear a bar on `adjustedAvgPercentile` among
 * multi-deck nonlands (relaxed if too few points). Cluster sort metric is
 * mean adjusted percentile of member cards (same scale as the card table).
 */
export function computeCardPerformanceClusters(
  decks: DeckWithCards[],
  cardCache: CardCacheFile,
  cardRows: CardAggregateRow[],
): CardPerformanceCluster[] {
  const decksOnFile = decks.filter((d) => d.lines.length > 0);
  if (decksOnFile.length < 4) return [];

  const deckPctls = decksOnFile.map((d) => d.percentileScore);
  const pctlMed = median(deckPctls);
  const focusDecks = decksOnFile.filter((d) => d.percentileScore >= pctlMed);
  const N = focusDecks.length;
  if (N < 3) return [];

  const deckKey = (i: number) => String(i);
  const docFreq = new Map<string, number>();
  for (let i = 0; i < focusDecks.length; i++) {
    const d = focusDecks[i]!;
    const seen = new Set<string>();
    for (const line of d.lines) {
      const oid = d.resolvedOracleIds[cardNameKey(line.name)];
      if (!oid || line.board !== "main") continue;
      if (!isNonlandMain(oid, line.board, cardCache)) continue;
      if (seen.has(oid)) continue;
      seen.add(oid);
      docFreq.set(oid, (docFreq.get(oid) ?? 0) + 1);
    }
  }

  const rowByOracle = new Map(cardRows.map((r) => [r.oracle_id, r]));
  const multiDeckRows = cardRows.filter(
    (r) => r.deckCount >= 2 && !/\bLand\b/.test(r.type_line),
  );
  const pctlBar =
    multiDeckRows.length > 0
      ? median(multiDeckRows.map((r) => r.adjustedAvgPercentile))
      : 50;

  let eligible = [...docFreq.keys()].filter((oid) => {
    if ((docFreq.get(oid) ?? 0) < 2) return false;
    const row = rowByOracle.get(oid);
    if (!row || row.deckCount < 2) return false;
    if (/\bLand\b/.test(row.type_line)) return false;
    return row.adjustedAvgPercentile >= pctlBar;
  });

  const minK = 2;
  const minPoints = 8;
  if (eligible.length < minPoints) {
    eligible = [...docFreq.keys()].filter((oid) => {
      if ((docFreq.get(oid) ?? 0) < 2) return false;
      const row = rowByOracle.get(oid);
      if (!row || row.deckCount < 2) return false;
      return !/\bLand\b/.test(row.type_line);
    });
  }

  const k = Math.min(
    4,
    Math.max(minK, Math.round(Math.sqrt(eligible.length / 2))),
  );
  if (eligible.length < k * 2) return [];

  const vectors: Map<string, number>[] = [];
  for (const oid of eligible) {
    const df = docFreq.get(oid) ?? 1;
    const idf = Math.log((N + 1) / (df + 1)) + 1;
    const v = new Map<string, number>();
    for (let i = 0; i < focusDecks.length; i++) {
      const d = focusDecks[i]!;
      const tf = mainNonlandQty(d, oid, cardCache);
      if (tf <= 0) continue;
      v.set(deckKey(i), tf * idf);
    }
    normalizeL2(v);
    vectors.push(v);
  }

  let centroids = pickInitialCentroids(vectors, k);
  const assign = vectors.map(() => 0);

  for (let iter = 0; iter < 40; iter++) {
    for (let i = 0; i < vectors.length; i++) {
      let best = -1;
      let bestJ = 0;
      for (let j = 0; j < k; j++) {
        const s = cosineSim(vectors[i]!, centroids[j]!);
        if (s > best) {
          best = s;
          bestJ = j;
        }
      }
      assign[i] = bestJ;
    }
    const next: Map<string, number>[] = [];
    for (let j = 0; j < k; j++) {
      next.push(centroidMean(vectors, assign, j));
    }
    centroids = next;
  }

  const memberIndex = new Map<string, number>();
  eligible.forEach((oid, i) => memberIndex.set(oid, i));

  const clusters: CardPerformanceCluster[] = [];
  for (let j = 0; j < k; j++) {
    const oracleIds = eligible.filter((_, i) => assign[i] === j);
    if (oracleIds.length === 0) continue;
    const centroid = centroids[j] ?? new Map<string, number>();
    const scores = oracleIds.map(
      (oid) => rowByOracle.get(oid)?.adjustedAvgPercentile ?? 0,
    );
    const avgMemberAvgScore =
      scores.reduce((a, b) => a + b, 0) / scores.length;
    clusters.push({
      id: j,
      label: labelFromCentroid(
        centroid,
        oracleIds,
        vectors,
        memberIndex,
        cardCache,
      ),
      oracleIds,
      avgMemberAvgScore,
      cardCount: oracleIds.length,
    });
  }

  return clusters
    .sort((a, b) => b.avgMemberAvgScore - a.avgMemberAvgScore)
    .map((c, i) => ({ ...c, id: i }));
}
