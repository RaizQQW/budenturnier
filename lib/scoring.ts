import type { MatchRow, StandingRow, TournamentMeta } from "./types";

/** Swiss-style match points for one seat (Bo3 games won). */
export function matchPointsForSeat(
  gamesSelf: number,
  gamesOpp: number,
): 0 | 1 | 3 {
  if (gamesSelf === 2 && gamesOpp < 2) return 3;
  if (gamesOpp === 2 && gamesSelf < 2) return 0;
  if (gamesSelf === 1 && gamesOpp === 1) return 1;
  throw new Error(
    `Invalid Bo3 scoreline ${gamesSelf}-${gamesOpp} (expected win 2-x, loss x-2, or draw 1-1)`,
  );
}

function bracketWeight(
  row: MatchRow,
  meta: TournamentMeta,
): number {
  if (row.phase !== "bracket") return 1;
  const s = meta.scoring;
  if (!s) return 1;
  if (row.bracketRound === "semis") return s.bracketSemisWeight;
  if (row.bracketRound === "third")
    return s.bracketThirdPlaceWeight ?? s.bracketSemisWeight;
  if (row.bracketRound === "finals") return s.bracketFinalsWeight;
  return 1;
}

export type PlayerScoreBreakdown = {
  displayName: string;
  swissMatchPoints: number;
  bracketWeightedPoints: number;
  placementBonus: number;
  performanceScore: number;
};

/**
 * Aggregates match rows into per-player Swiss points, bracket-weighted points,
 * and optional placement bump from final standings.
 */
export function computePlayerScores(
  matches: MatchRow[],
  standings: StandingRow[],
  meta: TournamentMeta,
): Map<string, PlayerScoreBreakdown> {
  const swiss = new Map<string, number>();
  const bracket = new Map<string, number>();

  const add = (m: Map<string, number>, name: string, pts: number) => {
    if (!name) return;
    m.set(name, (m.get(name) ?? 0) + pts);
  };

  for (const row of matches) {
    const w = bracketWeight(row, meta);

    if (row.bye && row.playerB == null) {
      const pts = 3;
      if (row.phase === "swiss") add(swiss, row.playerA, pts);
      else add(bracket, row.playerA, pts * w);
      continue;
    }

    if (!row.playerB) continue;

    const ptsA = matchPointsForSeat(row.gamesA, row.gamesB);
    const ptsB = matchPointsForSeat(row.gamesB, row.gamesA);

    if (row.phase === "swiss") {
      add(swiss, row.playerA, ptsA);
      add(swiss, row.playerB, ptsB);
    } else {
      add(bracket, row.playerA, ptsA * w);
      add(bracket, row.playerB, ptsB * w);
    }
  }

  const placementBonuses = meta.scoring?.placementBonuses ?? {};
  /** Stacking +6 for 1st on top of 2× finals match points over-credits winners for card stats. */
  const applyPlacementBonus =
    meta.scoring?.placementBonusWithMatches === true;
  const out = new Map<string, PlayerScoreBreakdown>();

  for (const s of standings) {
    const name = s.displayName;
    const sw = swiss.get(name) ?? 0;
    const br = bracket.get(name) ?? 0;
    const rawBonus = applyPlacementBonus
      ? (placementBonuses[String(s.rank)] ?? 0)
      : 0;
    const placementBonus =
      typeof rawBonus === "number" ? rawBonus : Number(rawBonus) || 0;
    const performanceScore = sw + br + placementBonus;
    out.set(name, {
      displayName: name,
      swissMatchPoints: sw,
      bracketWeightedPoints: br,
      placementBonus,
      performanceScore,
    });
  }

  // Players only in matches but missing from standings (should not happen)
  for (const name of new Set([...swiss.keys(), ...bracket.keys()])) {
    if (out.has(name)) continue;
    const sw = swiss.get(name) ?? 0;
    const br = bracket.get(name) ?? 0;
    out.set(name, {
      displayName: name,
      swissMatchPoints: sw,
      bracketWeightedPoints: br,
      placementBonus: 0,
      performanceScore: sw + br,
    });
  }

  return out;
}

/** Standings-only fallback when there are no matches. */
export function computeStandingsOnlyScores(
  standings: StandingRow[],
  meta: TournamentMeta,
): Map<string, PlayerScoreBreakdown> {
  const placementBonuses = meta.scoring?.placementBonuses ?? {};
  const out = new Map<string, PlayerScoreBreakdown>();
  for (const s of standings) {
    const bonus = placementBonuses[String(s.rank)] ?? 0;
    const placementBonus =
      typeof bonus === "number" ? bonus : Number(bonus) || 0;
    const mp = s.matchPoints;
    const performanceScore = mp + placementBonus;
    out.set(s.displayName, {
      displayName: s.displayName,
      swissMatchPoints: mp,
      bracketWeightedPoints: 0,
      placementBonus,
      performanceScore,
    });
  }
  return out;
}
