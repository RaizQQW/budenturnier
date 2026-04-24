import type {
  CardAggregateRow,
  CardPerformanceCluster,
  ParsedDeckLine,
  SuperArchetypePlayRate,
} from "./types";
import type { MetagameMatrixPayload } from "./metagameMatrix";

function esc(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function cardRowsToCsv(rows: CardAggregateRow[]): string {
  const headers = [
    "oracle_id",
    "name",
    "type_line",
    "deck_count",
    "play_rate",
    "sum_score",
    "avg_score",
    "sum_percentile",
    "avg_percentile",
    "adjusted_avg_percentile",
    "win_rate_delta",
    "top4_deck_count",
    "top4_rate",
    "best_rank",
    "avg_main_copies",
    "avg_side_copies",
    "main_copy_share",
    "side_copy_share",
    "total_copies_played",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        esc(r.oracle_id),
        esc(r.name),
        esc(r.type_line),
        String(r.deckCount),
        r.playRate.toFixed(4),
        r.sumPerformanceScore.toFixed(2),
        r.avgPerformanceScore.toFixed(2),
        r.sumPercentile.toFixed(2),
        r.avgPercentile.toFixed(2),
        r.adjustedAvgPercentile.toFixed(2),
        r.winRateDelta.toFixed(2),
        String(r.topCutDeckCount),
        r.topCutRate.toFixed(4),
        String(r.bestRank),
        r.avgMainCopies.toFixed(2),
        r.avgSideCopies.toFixed(2),
        r.mainCopyShare.toFixed(4),
        r.sideboardCopyShare.toFixed(4),
        String(r.totalCopiesPlayed),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

export function superArchetypePlayRatesToCsv(
  rows: SuperArchetypePlayRate[],
): string {
  const h = ["archetype", "decklists_with", "decklists_total", "play_rate"];
  const lines = [h.join(",")];
  for (const r of rows) {
    lines.push(
      [
        esc(r.archetype),
        String(r.decklistsWith),
        String(r.decklistsTotal),
        r.playRate.toFixed(4),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

export function metagameMatrixToCsv(m: MetagameMatrixPayload): string {
  const { archetypes, cells } = m;
  const lines = [
    "row_archetype,col_archetype,games_for_row,games_for_col,row_game_win_pct",
  ];
  for (const row of archetypes) {
    for (const col of archetypes) {
      if (row === col) continue;
      const c = cells[row]?.[col];
      if (!c) continue;
      const d = c.gamesForRow + c.gamesForCol;
      if (d === 0) continue;
      const pct =
        c.winRate != null ? (100 * c.winRate).toFixed(2) : "";
      lines.push(
        [
          esc(row),
          esc(col),
          String(c.gamesForRow),
          String(c.gamesForCol),
          pct,
        ].join(","),
      );
    }
  }
  return lines.join("\r\n");
}

export function cardPerformanceClustersToCsv(
  clusters: CardPerformanceCluster[],
  oracleNames: Record<string, string>,
): string {
  const h = [
    "cluster_id",
    "label",
    "card_count",
    "avg_member_avg_score",
    "oracle_id",
    "name",
  ];
  const lines = [h.join(",")];
  for (const c of clusters) {
    for (const oid of c.oracleIds) {
      lines.push(
        [
          String(c.id + 1),
          esc(c.label),
          String(c.cardCount),
          c.avgMemberAvgScore.toFixed(2),
          esc(oid),
          esc(oracleNames[oid] ?? oid),
        ].join(","),
      );
    }
  }
  return lines.join("\r\n");
}

export function decklistRowsToCsv(rows: ParsedDeckLine[]): string {
  const lines = ["cardnumber;card"];
  for (const row of rows) {
    lines.push([String(row.qty), row.name].join(";"));
  }
  return lines.join("\r\n");
}
