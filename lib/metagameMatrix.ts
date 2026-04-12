import type { MatchRow } from "./types";

export type MetagameCell = {
  /** Games won by row super-archetype vs column in all counted H2Hs. */
  gamesForRow: number;
  /** Games won by column super-archetype in those same matches. */
  gamesForCol: number;
  /** gamesForRow / (gamesForRow + gamesForCol); null if no games. */
  winRate: number | null;
};

export type MetagameMatrixPayload = {
  /** Column / row labels (same order) — harmonized / super-archetypes. */
  archetypes: string[];
  /** cells[row][col]: game wins for row vs col in row–col pairings. */
  cells: Record<string, Record<string, MetagameCell>>;
  /** Overall games won / lost per super-archetype (non-mirror, non-bye, non-draw). */
  archetypeRecords: Record<string, { gamesWon: number; gamesLost: number }>;
};

function addPair(
  m: Map<string, Map<string, { gRow: number; gCol: number }>>,
  rowArch: string,
  colArch: string,
  gRow: number,
  gCol: number,
) {
  if (!m.has(rowArch)) m.set(rowArch, new Map());
  const inner = m.get(rowArch)!;
  const cur = inner.get(colArch) ?? { gRow: 0, gCol: 0 };
  cur.gRow += gRow;
  cur.gCol += gCol;
  inner.set(colArch, cur);
}

/**
 * Builds super-archetype × super-archetype **game** totals from Bo3 pairings.
 * Uses `playerToSuperArch` (display name → harmonized label, typically).
 * Skips byes, intentional draws (1–1), incomplete lines, mirrors, and any
 * match where either player lacks a super-archetype tag.
 */
export function computeMetagameMatrix(
  matches: MatchRow[],
  playerToSuperArch: Map<string, string>,
): MetagameMatrixPayload | null {
  /** Directed cell[row][col] = games row scored vs col + games col scored vs row in shared matches. */
  const pairGames = new Map<string, Map<string, { gRow: number; gCol: number }>>();
  /** Per archetype: games that player won / games that player lost (all counted matches). */
  const overall = new Map<string, { gw: number; gl: number }>();

  function bumpOverall(arch: string, won: number, lost: number) {
    const cur = overall.get(arch) ?? { gw: 0, gl: 0 };
    cur.gw += won;
    cur.gl += lost;
    overall.set(arch, cur);
  }

  for (const row of matches) {
    if (row.bye || row.playerB == null) continue;
    const { playerA: A, playerB: B, gamesA: ga, gamesB: gb } = row;
    if (ga === 1 && gb === 1) continue;

    const archA = playerToSuperArch.get(A)?.trim();
    const archB = playerToSuperArch.get(B)?.trim();
    if (!archA || !archB || archA === archB) continue;

    const decisive =
      (ga === 2 && gb < 2) || (gb === 2 && ga < 2);
    if (!decisive) continue;

    addPair(pairGames, archA, archB, ga, gb);
    addPair(pairGames, archB, archA, gb, ga);
    bumpOverall(archA, ga, gb);
    bumpOverall(archB, gb, ga);
  }

  const archSet = new Set<string>();
  for (const [r, inner] of pairGames) {
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
  const archetypeRecords: Record<
    string,
    { gamesWon: number; gamesLost: number }
  > = {};

  for (const r of archetypes) {
    cells[r] = {};
    const o = overall.get(r) ?? { gw: 0, gl: 0 };
    archetypeRecords[r] = { gamesWon: o.gw, gamesLost: o.gl };
    for (const c of archetypes) {
      if (r === c) {
        cells[r][c] = {
          gamesForRow: 0,
          gamesForCol: 0,
          winRate: null,
        };
        continue;
      }
      const p = pairGames.get(r)?.get(c) ?? { gRow: 0, gCol: 0 };
      const dec = p.gRow + p.gCol;
      const winRate = dec > 0 ? p.gRow / dec : null;
      cells[r][c] = {
        gamesForRow: p.gRow,
        gamesForCol: p.gCol,
        winRate,
      };
    }
  }

  return { archetypes, cells, archetypeRecords };
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
