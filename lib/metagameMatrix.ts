import type { MatchRow } from "./types";

export type MetagameCell = {
  /** Games won by row super-archetype vs column in all counted H2Hs. */
  gamesForRow: number;
  /** Games won by column super-archetype in those same matches. */
  gamesForCol: number;
  /** gamesForRow / (gamesForRow + gamesForCol); null if no games. */
  winRate: number | null;
  /** Matches (not games) won by row vs col. */
  matchesForRow: number;
  /** Matches won by col vs row. */
  matchesForCol: number;
  /** matchesForRow / (matchesForRow + matchesForCol); null if no matches. */
  matchWinRate: number | null;
};

export type MetagameMatrixPayload = {
  /** Column / row labels (same order) — harmonized / super-archetypes. */
  archetypes: string[];
  /** cells[row][col]: game wins for row vs col in row–col pairings. */
  cells: Record<string, Record<string, MetagameCell>>;
  /** Overall games won / lost per super-archetype (non-mirror, non-bye). */
  archetypeRecords: Record<string, { gamesWon: number; gamesLost: number }>;
  /** Overall matches won / lost per super-archetype (non-mirror, non-bye, draws excluded). */
  archetypeMatchRecords: Record<string, { matchesWon: number; matchesLost: number }>;
};

function addPair(
  m: Map<string, Map<string, { gRow: number; gCol: number; mRow: number; mCol: number }>>,
  rowArch: string,
  colArch: string,
  gRow: number,
  gCol: number,
  mRow: number,
  mCol: number,
) {
  if (!m.has(rowArch)) m.set(rowArch, new Map());
  const inner = m.get(rowArch)!;
  const cur = inner.get(colArch) ?? { gRow: 0, gCol: 0, mRow: 0, mCol: 0 };
  cur.gRow += gRow;
  cur.gCol += gCol;
  cur.mRow += mRow;
  cur.mCol += mCol;
  inner.set(colArch, cur);
}

/**
 * Builds super-archetype × super-archetype **game** and **match** totals from Bo3 pairings.
 * Uses `playerToSuperArch` (display name → harmonized label, typically).
 * Includes draws (1–1): each side won a game, so both game wins count.
 * Skips byes, mirrors, and any match where either player lacks a tag.
 * Draws (gamesA === gamesB) are excluded from match win/loss counts.
 */
export function computeMetagameMatrix(
  matches: MatchRow[],
  playerToSuperArch: Map<string, string>,
): MetagameMatrixPayload | null {
  const pairData = new Map<string, Map<string, { gRow: number; gCol: number; mRow: number; mCol: number }>>();
  const overall = new Map<string, { gw: number; gl: number; mw: number; ml: number }>();

  function bumpOverall(arch: string, gWon: number, gLost: number, mWon: number, mLost: number) {
    const cur = overall.get(arch) ?? { gw: 0, gl: 0, mw: 0, ml: 0 };
    cur.gw += gWon;
    cur.gl += gLost;
    cur.mw += mWon;
    cur.ml += mLost;
    overall.set(arch, cur);
  }

  for (const row of matches) {
    if (row.bye) continue;
    const A = row.playerA;
    const B = row.playerB;
    const { gamesA: ga, gamesB: gb } = row;
    if (!A || !B) continue;
    if (ga === 0 && gb === 0) continue;

    const archA = playerToSuperArch.get(A)?.trim();
    const archB = playerToSuperArch.get(B)?.trim();
    if (!archA || !archB || archA === archB) continue;

    // Match win/loss (draws excluded from match counts)
    const mA = ga > gb ? 1 : 0;
    const mB = gb > ga ? 1 : 0;

    addPair(pairData, archA, archB, ga, gb, mA, mB);
    addPair(pairData, archB, archA, gb, ga, mB, mA);
    bumpOverall(archA, ga, gb, mA, mB);
    bumpOverall(archB, gb, ga, mB, mA);
  }

  const archSet = new Set<string>();
  for (const [r, inner] of pairData) {
    archSet.add(r);
    for (const c of inner.keys()) archSet.add(c);
  }
  for (const a of overall.keys()) archSet.add(a);

  const archetypes = [...archSet].sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return a.localeCompare(b);
  });

  if (archetypes.length < 2) return null;

  const cells: Record<string, Record<string, MetagameCell>> = {};
  const archetypeRecords: Record<string, { gamesWon: number; gamesLost: number }> = {};
  const archetypeMatchRecords: Record<string, { matchesWon: number; matchesLost: number }> = {};

  for (const r of archetypes) {
    cells[r] = {};
    const o = overall.get(r) ?? { gw: 0, gl: 0, mw: 0, ml: 0 };
    archetypeRecords[r] = { gamesWon: o.gw, gamesLost: o.gl };
    archetypeMatchRecords[r] = { matchesWon: o.mw, matchesLost: o.ml };
    for (const c of archetypes) {
      if (r === c) {
        cells[r][c] = { gamesForRow: 0, gamesForCol: 0, winRate: null, matchesForRow: 0, matchesForCol: 0, matchWinRate: null };
        continue;
      }
      const p = pairData.get(r)?.get(c) ?? { gRow: 0, gCol: 0, mRow: 0, mCol: 0 };
      const gDec = p.gRow + p.gCol;
      const mDec = p.mRow + p.mCol;
      cells[r][c] = {
        gamesForRow: p.gRow,
        gamesForCol: p.gCol,
        winRate: gDec > 0 ? p.gRow / gDec : null,
        matchesForRow: p.mRow,
        matchesForCol: p.mCol,
        matchWinRate: mDec > 0 ? p.mRow / mDec : null,
      };
    }
  }

  return { archetypes, cells, archetypeRecords, archetypeMatchRecords };
}

/** CSS background for win rate in [0,1]. */
export function metagameHeatColor(winRate: number | null): string {
  if (winRate == null || Number.isNaN(winRate))
    return "rgb(250 250 250)"; // zinc-50
  const t = Math.max(0, Math.min(1, winRate));
  const hue = 120 * t;
  const sat = 55;
  const light = 42 - 12 * Math.abs(t - 0.5);
  return `hsl(${hue} ${sat}% ${light}%)`;
}
