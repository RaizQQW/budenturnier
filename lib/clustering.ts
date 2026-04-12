import type { ArchetypeCluster, CardCacheFile, DeckWithCards } from "./types";
import { cardNameKey } from "./parseDecklist";

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

/** Deck vector: oracle_id -> tf-idf (main nonland only). */
export function buildDeckVectors(
  decks: DeckWithCards[],
  cache: CardCacheFile,
): { ids: string[]; vectors: Map<string, number>[]; oracleIds: string[] } {
  const deckIds: string[] = [];
  const vectors: Map<string, number>[] = [];
  const docFreq = new Map<string, number>();
  let N = 0;

  const rawCounts: Map<string, number>[] = [];

  for (const d of decks) {
    if (d.lines.length === 0) continue;
    const counts = new Map<string, number>();
    for (const line of d.lines) {
      const oid = d.resolvedOracleIds[cardNameKey(line.name)];
      if (!oid) continue;
      if (!isNonlandMain(oid, line.board, cache)) continue;
      counts.set(oid, (counts.get(oid) ?? 0) + line.qty);
    }
    if (counts.size === 0) continue;
    rawCounts.push(counts);
    deckIds.push(d.playerId);
    N++;
    for (const oid of counts.keys()) {
      docFreq.set(oid, (docFreq.get(oid) ?? 0) + 1);
    }
  }

  for (const counts of rawCounts) {
    const v = new Map<string, number>();
    for (const [oid, tf] of counts) {
      const df = docFreq.get(oid) ?? 1;
      const idf = Math.log((N + 1) / (df + 1)) + 1;
      v.set(oid, tf * idf);
    }
    const norm = Math.hypot(...v.values()) || 1;
    for (const k of v.keys()) v.set(k, (v.get(k) ?? 0) / norm);
    vectors.push(v);
  }

  const oracleIds = [...docFreq.keys()];
  return { ids: deckIds, vectors, oracleIds };
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
    for (const [oid, val] of vectors[i]) {
      sum.set(oid, (sum.get(oid) ?? 0) + val);
    }
  }
  const out = new Map<string, number>();
  if (n === 0) return out;
  for (const [oid, s] of sum) out.set(oid, s / n);
  const norm = Math.hypot(...out.values()) || 1;
  for (const k of out.keys()) out.set(k, (out.get(k) ?? 0) / norm);
  return out;
}

function cosineSim(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (vb != null) dot += va * vb;
  }
  return dot;
}

function labelCluster(
  centroid: Map<string, number>,
  cache: CardCacheFile,
  top = 3,
): string {
  const sorted = [...centroid.entries()].sort((x, y) => y[1] - x[1]);
  const names = sorted
    .slice(0, top)
    .map(([oid]) => cache.cards[oid]?.name ?? oid);
  return names.join(" · ");
}

export function clusterDecksByMainNonland(
  decks: DeckWithCards[],
  cache: CardCacheFile,
  k: number,
): ArchetypeCluster[] {
  const { ids, vectors } = buildDeckVectors(decks, cache);
  if (vectors.length < k || k < 2) return [];

  let centroids = pickInitialCentroids(vectors, k);
  const assign = vectors.map(() => 0);

  for (let iter = 0; iter < 40; iter++) {
    for (let i = 0; i < vectors.length; i++) {
      let best = 0;
      let bestJ = 0;
      for (let j = 0; j < k; j++) {
        const s = cosineSim(vectors[i], centroids[j]);
        if (s > best || (s === best && j < bestJ)) {
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

  const scoreByDeck = new Map(decks.map((d) => [d.playerId, d.performanceScore]));

  const clusters: ArchetypeCluster[] = [];
  for (let j = 0; j < k; j++) {
    const playerIds = ids.filter((_, i) => assign[i] === j);
    const scores = playerIds.map((id) => scoreByDeck.get(id) ?? 0);
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    const centroid = centroids[j] ?? new Map();
    const distinctiveOracleIds = [...centroid.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([oid]) => oid);
    clusters.push({
      id: j,
      label: labelCluster(centroid, cache),
      playerIds,
      avgScore,
      distinctiveOracleIds,
    });
  }

  return clusters.sort((a, b) => b.avgScore - a.avgScore);
}
